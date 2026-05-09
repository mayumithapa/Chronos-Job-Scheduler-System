const { prisma } = require("../config/database");
const { jobQueue } = require("../queues/jobQueue");

async function getOverview() {
  const grouped = await prisma.job.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = grouped.reduce((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Live BullMQ queue stats
  const [waiting, active, delayed, completed, failed] = await Promise.all([
    jobQueue.getWaitingCount(),
    jobQueue.getActiveCount(),
    jobQueue.getDelayedCount(),
    jobQueue.getCompletedCount(),
    jobQueue.getFailedCount(),
  ]);

  const totalRuns = await prisma.jobRun.count();
  const successfulRuns = await prisma.jobRun.count({
    where: { status: "SUCCESS" },
  });
  const failedRuns = await prisma.jobRun.count({
    where: { status: "FAILED" },
  });

  return {
    totalJobs: total,
    successfulJobs: counts.SUCCESS ?? 0,
    failedJobs: counts.FAILED ?? 0,
    queuedJobs: counts.QUEUED ?? 0,
    runningJobs: counts.RUNNING ?? 0,
    pendingJobs: counts.PENDING ?? 0,
    cancelledJobs: counts.CANCELLED ?? 0,
    pausedJobs: counts.PAUSED ?? 0,
    runs: {
      total: totalRuns,
      successful: successfulRuns,
      failed: failedRuns,
      successRate:
        totalRuns === 0
          ? 0
          : Number(((successfulRuns / totalRuns) * 100).toFixed(2)),
    },
    queue: {
      waiting,
      active,
      delayed,
      completed,
      failed,
    },
  };
}

async function getRecentRuns(limit = 20) {
  return prisma.jobRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      job: { select: { id: true, name: true, type: true } },
    },
  });
}

module.exports = { getOverview, getRecentRuns };
