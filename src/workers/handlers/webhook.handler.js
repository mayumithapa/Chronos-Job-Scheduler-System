const logger = require("../../config/logger");

async function handle({ job, payload }) {
  const { url, method = "POST", headers = {}, body } = payload || {};

  if (!url) {
    throw new Error("WEBHOOK payload requires `url`");
  }

  const start = Date.now();
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Chronos/1.0",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text().catch(() => "");
  const elapsedMs = Date.now() - start;

  if (!response.ok) {
    throw new Error(
      `Webhook responded with ${response.status} ${response.statusText}: ${text.slice(0, 256)}`
    );
  }

  logger.info(`[WEBHOOK handler] ${method} ${url} -> ${response.status}`, {
    jobId: job.id,
    elapsedMs,
  });

  return {
    status: response.status,
    elapsedMs,
    bodyPreview: text.slice(0, 512),
  };
}

module.exports = { handle };
