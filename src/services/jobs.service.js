const cronParser = require("cron-parser");
const { prisma } = require("../config/database");
const { jobQueue } = require("../queues/jobQueue");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { toBullPriority } = require("../utils/priority");
const logger = require("../config/logger");

// ---------- helpers ----------

function buildJobName(job) {
  // BullMQ uses this `name` for filter / repeat pairing.
  return `chronos:${job.type.toLowerCase()}:${job.id}`;
}

function computeDelayMs(scheduledAt) {
  if (!scheduledAt) return 0;
  const ts = new Date(scheduledAt).getTime();
  return Math.max(0, ts - Date.now());
}

async function enqueueOneTimeJob(job) {
  const name = buildJobName(job);
  const delay = computeDelayMs(job.scheduledAt);
  const bullJob = await jobQueue.add(
    name,
    { jobId: job.id },
    {
      jobId: `chronos-${job.id}`,
      delay,
      priority: toBullPriority(job.priority),
    }
  );
  return { queueJobId: bullJob.id, repeatJobKey: null };
}

async function enqueueRecurringJob(job) {
  const name = buildJobName(job);
  const bullJob = await jobQueue.add(
    name,
    { jobId: job.id },
    {
      repeat: { pattern: job.cronExpression },
      priority: toBullPriority(job.priority),
    }
  );
  // For repeatable jobs BullMQ creates an entry whose `repeatJobKey` we need
  // in order to remove it later.
  return {
    queueJobId: bullJob.id ?? null,
    repeatJobKey: bullJob.repeatJobKey ?? null,
  };
}

async function removeFromQueue(job) {
  try {
    if (job.cronExpression && job.repeatJobKey) {
      await jobQueue.removeJobScheduler?.(job.repeatJobKey).catch(() => {});
      await jobQueue
        .removeRepeatableByKey?.(job.repeatJobKey)
        .catch(() => {});
    }
    if (job.queueJobId) {
      const queued = await jobQueue.getJob(job.queueJobId);
      if (queued) await queued.remove().catch(() => {});
    }
  } catch (err) {
    logger.warn("Failed to remove job from queue", {
      jobId: job.id,
      message: err.message,
    });
  }
}

function nextRunFromCron(cronExpression) {
  try {
    const interval = cronParser.parseExpression(cronExpression);
    return interval.next().toDate();
  } catch {
    return null;
  }
}

// "Next run" is only meaningful while a job is actively waiting/working.
// Paused/cancelled/done jobs have no scheduled future execution.
const ACTIVE_STATUSES = new Set(["PENDING", "QUEUED", "RUNNING"]);

function computeNextRunAt(job) {
  if (!ACTIVE_STATUSES.has(job.status)) return null;
  return job.cronExpression
    ? nextRunFromCron(job.cronExpression)
    : job.scheduledAt;
}

// ---------- core API ----------

async function createJob(userId, payload) {
  const {
    name,
    type,
    payload: data,
    scheduledAt,
    cron,
    priority,
    maxRetries,
  } = payload;

  if (!scheduledAt && !cron) {
    // Run as soon as possible
  }

  const created = await prisma.job.create({
    data: {
      userId,
      name,
      type,
      payload: data ?? {},
      priority: priority ?? "NORMAL",
      maxRetries: maxRetries ?? env.queue.defaultMaxRetries,
      scheduledAt: cron ? null : scheduledAt ? new Date(scheduledAt) : new Date(),
      cronExpression: cron ?? null,
      status: "PENDING",
    },
  });

  let enqueued;
  if (cron) {
    enqueued = await enqueueRecurringJob(created);
  } else {
    enqueued = await enqueueOneTimeJob(created);
  }

  return prisma.job.update({
    where: { id: created.id },
    data: {
      status: "QUEUED",
      queueJobId: enqueued.queueJobId,
      repeatJobKey: enqueued.repeatJobKey,
    },
  });
}

async function listJobs(userId, { status, type, page, pageSize }) {
  const where = { userId };
  if (status) where.status = status;
  if (type) where.type = type;

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { runs: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  const enhanced = items.map((job) => ({
    ...job,
    nextRunAt: computeNextRunAt(job),
  }));

  return {
    items: enhanced,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getJob(userId, id) {
  const job = await prisma.job.findFirst({
    where: { id, userId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 25,
      },
    },
  });
  if (!job) throw ApiError.notFound("Job not found");
  return {
    ...job,
    nextRunAt: computeNextRunAt(job),
  };
}

async function updateJob(userId, id, patch) {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw ApiError.notFound("Job not found");

  if (["RUNNING", "SUCCESS", "CANCELLED"].includes(job.status)) {
    throw ApiError.badRequest(
      `Cannot update a job in status ${job.status}`
    );
  }

  const reschedule =
    patch.scheduledAt !== undefined || patch.cron !== undefined;

  if (reschedule) {
    await removeFromQueue(job);
  }

  const updateData = {};
  if (patch.name !== undefined) updateData.name = patch.name;
  if (patch.payload !== undefined) updateData.payload = patch.payload;
  if (patch.priority !== undefined) updateData.priority = patch.priority;
  if (patch.maxRetries !== undefined) updateData.maxRetries = patch.maxRetries;

  if (reschedule) {
    if (patch.cron) {
      updateData.cronExpression = patch.cron;
      updateData.scheduledAt = null;
    } else if (patch.scheduledAt) {
      updateData.scheduledAt = new Date(patch.scheduledAt);
      updateData.cronExpression = null;
    }
  }

  let updated = await prisma.job.update({
    where: { id: job.id },
    data: updateData,
  });

  if (reschedule) {
    const enqueued = updated.cronExpression
      ? await enqueueRecurringJob(updated)
      : await enqueueOneTimeJob(updated);

    updated = await prisma.job.update({
      where: { id: updated.id },
      data: {
        status: "QUEUED",
        queueJobId: enqueued.queueJobId,
        repeatJobKey: enqueued.repeatJobKey,
        retryCount: 0,
      },
    });
  }

  return updated;
}

async function cancelJob(userId, id) {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw ApiError.notFound("Job not found");
  if (["SUCCESS", "CANCELLED"].includes(job.status)) {
    throw ApiError.badRequest(`Job already ${job.status.toLowerCase()}`);
  }

  await removeFromQueue(job);

  return prisma.job.update({
    where: { id: job.id },
    data: {
      status: "CANCELLED",
      queueJobId: null,
      repeatJobKey: null,
    },
  });
}

async function pauseJob(userId, id) {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw ApiError.notFound("Job not found");
  if (job.status === "PAUSED") return job;
  if (!["PENDING", "QUEUED"].includes(job.status)) {
    throw ApiError.badRequest(
      `Cannot pause a job in status ${job.status}`
    );
  }

  await removeFromQueue(job);

  return prisma.job.update({
    where: { id: job.id },
    data: {
      status: "PAUSED",
      queueJobId: null,
      repeatJobKey: null,
    },
  });
}

async function resumeJob(userId, id) {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw ApiError.notFound("Job not found");
  if (job.status !== "PAUSED") {
    throw ApiError.badRequest("Only paused jobs can be resumed");
  }

  const enqueued = job.cronExpression
    ? await enqueueRecurringJob(job)
    : await enqueueOneTimeJob(job);

  return prisma.job.update({
    where: { id: job.id },
    data: {
      status: "QUEUED",
      queueJobId: enqueued.queueJobId,
      repeatJobKey: enqueued.repeatJobKey,
    },
  });
}

async function rescheduleJob(userId, id, patch) {
  return updateJob(userId, id, patch);
}

async function listRuns(userId, id, { page, pageSize }) {
  const job = await prisma.job.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!job) throw ApiError.notFound("Job not found");

  const [items, total] = await Promise.all([
    prisma.jobRun.findMany({
      where: { jobId: id },
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.jobRun.count({ where: { jobId: id } }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

module.exports = {
  createJob,
  listJobs,
  getJob,
  updateJob,
  cancelJob,
  pauseJob,
  resumeJob,
  rescheduleJob,
  listRuns,
};
