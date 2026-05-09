const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function asBool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function asInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: asInt(process.env.PORT, 4000),
  apiBasePath: optional("API_BASE_PATH", "/api/v1"),

  databaseUrl: required("DATABASE_URL"),

  redis: {
    // If REDIS_URL is set, it wins (e.g. redis:// or rediss:// from a cloud provider).
    url: optional("REDIS_URL", undefined),
    host: optional("REDIS_HOST", "localhost"),
    port: asInt(process.env.REDIS_PORT, 6379),
    password: optional("REDIS_PASSWORD", undefined),
    db: asInt(process.env.REDIS_DB, 0),
  },

  jwt: {
    secret: required("JWT_SECRET", "dev-only-insecure-secret-change-me"),
    expiresIn: optional("JWT_EXPIRES_IN", "7d"),
  },

  queue: {
    name: optional("JOB_QUEUE_NAME", "chronos-jobs"),
    workerConcurrency: asInt(process.env.WORKER_CONCURRENCY, 5),
    defaultMaxRetries: asInt(process.env.DEFAULT_MAX_RETRIES, 3),
    defaultBackoffMs: asInt(process.env.DEFAULT_RETRY_BACKOFF_MS, 5000),
  },

  log: {
    level: optional("LOG_LEVEL", "info"),
  },

  bullBoard: {
    enabled: asBool(process.env.BULL_BOARD_ENABLED, true),
    path: optional("BULL_BOARD_PATH", "/admin/queues"),
  },

  smtp: {
    host: optional("SMTP_HOST", undefined),
    port: asInt(process.env.SMTP_PORT, 587),
    user: optional("SMTP_USER", undefined),
    pass: optional("SMTP_PASS", undefined),
    from: optional("SMTP_FROM", "Chronos <noreply@chronos.local>"),
  },
};

env.isProd = env.nodeEnv === "production";
env.isDev = env.nodeEnv === "development";
env.isTest = env.nodeEnv === "test";

module.exports = env;
