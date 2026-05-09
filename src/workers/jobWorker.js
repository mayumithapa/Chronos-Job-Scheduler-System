const { Worker } = require("bullmq");
const env = require("../config/env");
const logger = require("../config/logger");
const { redisConnection } = require("../config/redis");
const { prisma } = require("../config/database");
const { jobQueue } = require("../queues/jobQueue");
const { getHandler } = require("./handlers");
const { toBullPriority } = require("../utils/priority");
const { notifyJobPermanentlyFailed } = require("../services/notifier.service");

const QUEUE_NAME = env.queue.name;

function backoffDelay(attempt) {
  // Exponential backoff: base * 2^(attempt-1), capped at 5 minutes
  const cap = 5 * 60 * 1000;
  const base = env.queue.defaultBackoffMs;
  return Math.min(base * Math.pow(2, Math.max(attempt - 1, 0)), cap);
}

async function loadDbJob(jobId) {
  return prisma.job.findUnique({
    where: { id: jobId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

async function processBullJob(bullJob) {
  const { jobId } = bullJob.data || {};
  if (!jobId) {
    throw new Error("BullMQ job missing data.jobId");
  }

  const dbJob = await loadDbJob(jobId);
  if (!dbJob) {
    logger.warn(`Skipping orphan queue job (db record gone)`, { jobId });
    return { skipped: true };
  }

  if (["CANCELLED", "PAUSED"].includes(dbJob.status)) {
    logger.info(`Skipping ${dbJob.status} job`, { jobId });
    return { skipped: true, status: dbJob.status };
  }

  const isRecurring = !!dbJob.cronExpression;
  const attemptNumber = (dbJob.retryCount ?? 0) + 1;

  await prisma.job.update({
    where: { id: dbJob.id },
    data: { status: "RUNNING" },
  });

  const run = await prisma.jobRun.create({
    data: {
      jobId: dbJob.id,
      status: "RUNNING",
      attemptNumber,
    },
  });

  const start = Date.now();

  try {
    const handler = getHandler(dbJob.type);
    const output = await handler.handle({
      job: dbJob,
      payload: dbJob.payload,
      bullJob,
    });

    const elapsed = Date.now() - start;

    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        completedAt: new Date(),
        executionTime: elapsed,
        output: output ?? null,
      },
    });

    await prisma.job.update({
      where: { id: dbJob.id },
      data: {
        status: isRecurring ? "QUEUED" : "SUCCESS",
        retryCount: 0,
        lastError: null,
      },
    });

    logger.info(`Job ${dbJob.id} (${dbJob.type}) completed in ${elapsed}ms`);
    return { ok: true, runId: run.id, elapsed };
  } catch (err) {
    const elapsed = Date.now() - start;
    const message = err?.message ?? String(err);

    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        executionTime: elapsed,
        errorMessage: message,
      },
    });

    const newRetryCount = attemptNumber; // attempts performed so far
    const canRetry = newRetryCount < dbJob.maxRetries;

    if (canRetry) {
      const delay = backoffDelay(newRetryCount);

      await prisma.job.update({
        where: { id: dbJob.id },
        data: {
          status: "QUEUED",
          retryCount: newRetryCount,
          lastError: message,
        },
      });

      // Re-enqueue as a one-shot with backoff. Recurring jobs continue to
      // tick on their normal schedule via the existing repeatable entry.
      const retryName = `chronos:retry:${dbJob.id}`;
      const enqueued = await jobQueue.add(
        retryName,
        { jobId: dbJob.id },
        {
          delay,
          jobId: `chronos-${dbJob.id}-retry-${newRetryCount}`,
          priority: toBullPriority(dbJob.priority),
        }
      );

      if (!isRecurring) {
        await prisma.job.update({
          where: { id: dbJob.id },
          data: { queueJobId: enqueued.id },
        });
      }

      logger.warn(
        `Job ${dbJob.id} failed (attempt ${newRetryCount}/${dbJob.maxRetries}). Retrying in ${delay}ms`,
        { error: message }
      );

      // Returning normally so BullMQ does not mark the job failed —
      // we have explicitly scheduled a retry instead.
      return { retried: true, attempt: newRetryCount, delay };
    }

    await prisma.job.update({
      where: { id: dbJob.id },
      data: {
        status: isRecurring ? "QUEUED" : "FAILED",
        retryCount: newRetryCount,
        lastError: message,
      },
    });

    logger.error(
      `Job ${dbJob.id} failed permanently after ${newRetryCount} attempts`,
      { error: message }
    );

    // Notify the owning user that their job has consistently failed.
    // Logs always; emails when SMTP is configured.
    try {
      await notifyJobPermanentlyFailed({
        job: dbJob,
        attempts: newRetryCount,
        error: message,
      });
    } catch (notifyErr) {
      logger.warn("Failed to dispatch failure notification", {
        jobId: dbJob.id,
        error: notifyErr?.message ?? String(notifyErr),
      });
    }

    // For recurring jobs, the next cron tick will reset retryCount on success.
    // For one-time jobs, we leave the FAILED state in place.
    if (!isRecurring) {
      // Surface the failure to BullMQ so it appears in failed metrics & UI.
      throw new Error(message);
    }
    return { failed: true, error: message };
  }
}

function startWorker() {
  const worker = new Worker(QUEUE_NAME, processBullJob, {
    connection: redisConnection,
    concurrency: env.queue.workerConcurrency,
  });

  worker.on("ready", () =>
    logger.info(
      `Worker ready (queue=${QUEUE_NAME}, concurrency=${env.queue.workerConcurrency})`
    )
  );
  worker.on("completed", (job) =>
    logger.debug(`BullMQ job ${job.id} (${job.name}) completed`)
  );
  worker.on("failed", (job, err) =>
    logger.error(`BullMQ job ${job?.id ?? "?"} (${job?.name ?? "?"}) failed`, {
      message: err?.message,
    })
  );
  worker.on("error", (err) =>
    logger.error("Worker error", { message: err.message })
  );

  return worker;
}

module.exports = { startWorker, processBullJob };
