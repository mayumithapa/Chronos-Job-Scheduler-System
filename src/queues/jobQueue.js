const { Queue, QueueEvents } = require("bullmq");
const env = require("../config/env");
const { redisConnection, createRedisConnection } = require("../config/redis");
const logger = require("../config/logger");

const QUEUE_NAME = env.queue.name;

const jobQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // we control retries explicitly via worker logic
    removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
});

const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: createRedisConnection(),
});

queueEvents.on("error", (err) =>
  logger.error("QueueEvents error", { message: err.message })
);

async function closeQueue() {
  try {
    await queueEvents.close();
    await jobQueue.close();
    logger.info("BullMQ queue closed");
  } catch (err) {
    logger.warn("Error closing queue", { message: err.message });
  }
}

module.exports = {
  QUEUE_NAME,
  jobQueue,
  queueEvents,
  closeQueue,
};
