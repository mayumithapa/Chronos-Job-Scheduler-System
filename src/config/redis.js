const IORedis = require("ioredis");
const env = require("./env");
const logger = require("./logger");

// BullMQ requires `maxRetriesPerRequest: null` and a separate connection
// for blocking operations. We expose a factory so producers and workers can
// each spin up their own connection while sharing config.
function createRedisConnection(overrides = {}) {
  const baseOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    ...overrides,
  };

  // Prefer REDIS_URL (e.g. from Upstash, Render, Railway). Fall back to host/port.
  const connection = env.redis.url
    ? new IORedis(env.redis.url, baseOptions)
    : new IORedis({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password || undefined,
        db: env.redis.db,
        ...baseOptions,
      });

  connection.on("connect", () => logger.info("Redis connection established"));
  connection.on("error", (err) =>
    logger.error("Redis connection error", { message: err.message })
  );

  return connection;
}

const redisConnection = createRedisConnection();

async function disconnectRedis() {
  try {
    await redisConnection.quit();
    logger.info("Redis connection closed");
  } catch (err) {
    logger.warn("Error closing redis connection", { message: err.message });
  }
}

module.exports = {
  redisConnection,
  createRedisConnection,
  disconnectRedis,
};
