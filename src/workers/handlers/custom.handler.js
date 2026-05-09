const logger = require("../../config/logger");

// CUSTOM is a demonstration handler — it runs whatever script-like behavior
// you encode into the payload. By default it just echoes the payload back.
//
// Set payload.fail = true to simulate a failing job (useful to demo retries).
// Set payload.delayMs to artificially extend the run time.
async function handle({ job, payload }) {
  if (payload?.delayMs) {
    await new Promise((r) => setTimeout(r, Math.min(payload.delayMs, 60_000)));
  }

  if (payload?.fail) {
    throw new Error(payload.failMessage ?? "Simulated failure");
  }

  logger.info(`[CUSTOM handler] executed`, { jobId: job.id });
  return { echo: payload ?? {} };
}

module.exports = { handle };
