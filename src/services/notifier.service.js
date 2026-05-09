const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("../config/logger");
const { prisma } = require("../config/database");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host) return null;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth:
      env.smtp.user && env.smtp.pass
        ? { user: env.smtp.user, pass: env.smtp.pass }
        : undefined,
  });
  return transporter;
}

/**
 * Notify the owning user that one of their jobs has consistently failed and
 * exhausted its retry budget. Always emits a [NOTIFY] log line so the event
 * is visible during demos / in production logs even when SMTP is not wired.
 * Sends an actual email when SMTP env vars are configured.
 */
async function notifyJobPermanentlyFailed({ job, attempts, error }) {
  const user = job.user
    ? job.user
    : await prisma.user.findUnique({
        where: { id: job.userId },
        select: { id: true, name: true, email: true },
      });

  const summary = `Job "${job.name}" (id=${job.id}) failed permanently after ${attempts} attempt(s): ${error}`;

  logger.error(`[NOTIFY] ${summary}`, {
    jobId: job.id,
    userId: job.userId,
    userEmail: user?.email,
    attempts,
    error,
  });

  const tx = getTransporter();
  if (!tx || !user?.email) {
    return { notified: true, channel: "log", recipient: user?.email ?? null };
  }

  try {
    const info = await tx.sendMail({
      from: env.smtp.from,
      to: user.email,
      subject: `[Chronos] Job "${job.name}" failed`,
      text: [
        `Hi ${user.name ?? "there"},`,
        ``,
        `Your job "${job.name}" (id ${job.id}) has failed after ${attempts} attempt(s) and will not be retried automatically.`,
        ``,
        `Last error: ${error}`,
        ``,
        `You can inspect the run history and reschedule it from the Chronos dashboard.`,
        ``,
        `— Chronos`,
      ].join("\n"),
    });
    logger.info(`[NOTIFY] failure email sent (messageId=${info.messageId})`, {
      jobId: job.id,
      recipient: user.email,
    });
    return { notified: true, channel: "email", recipient: user.email };
  } catch (err) {
    logger.warn(`[NOTIFY] failed to send email, fell back to log`, {
      jobId: job.id,
      error: err?.message ?? String(err),
    });
    return { notified: true, channel: "log", recipient: user.email };
  }
}

module.exports = { notifyJobPermanentlyFailed };
