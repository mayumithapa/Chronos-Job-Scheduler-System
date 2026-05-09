const nodemailer = require("nodemailer");
const env = require("../../config/env");
const logger = require("../../config/logger");

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

async function handle({ job, payload }) {
  const { email, to, subject, text, html } = payload || {};
  const recipient = to ?? email;
  if (!recipient) throw new Error("EMAIL payload requires `to` (or `email`)");

  const tx = getTransporter();
  if (!tx) {
    // No SMTP configured - log and treat as success so the demo flow works.
    logger.info(
      `[EMAIL handler] (mock) Would send "${subject ?? "(no subject)"}" to ${recipient}`,
      { jobId: job.id }
    );
    return {
      mocked: true,
      recipient,
      subject: subject ?? null,
    };
  }

  const info = await tx.sendMail({
    from: env.smtp.from,
    to: recipient,
    subject: subject ?? "Chronos notification",
    text: text ?? "",
    html: html ?? undefined,
  });

  logger.info(`[EMAIL handler] sent message ${info.messageId}`, {
    jobId: job.id,
    recipient,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

module.exports = { handle };
