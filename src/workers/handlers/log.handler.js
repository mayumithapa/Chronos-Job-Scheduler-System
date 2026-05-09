const logger = require("../../config/logger");

// A trivial handler — perfect for demos / capstone walkthroughs.
// The job is considered successful when the message is logged.
async function handle({ job, payload }) {
  const message = payload?.message ?? `Chronos LOG job ${job.id} executed`;
  logger.info(`[LOG handler] ${message}`, {
    jobId: job.id,
    jobName: job.name,
  });
  return { message, executedAt: new Date().toISOString() };
}

module.exports = { handle };
