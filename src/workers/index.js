const logger = require("../config/logger");
const { connectDatabase, disconnectDatabase } = require("../config/database");
const { closeQueue } = require("../queues/jobQueue");
const { disconnectRedis } = require("../config/redis");
const { startWorker } = require("./jobWorker");

async function bootstrap() {
  await connectDatabase();
  const worker = startWorker();
  logger.info("Chronos worker started");

  const shutdown = async (signal) => {
    logger.info(`Worker received ${signal}, shutting down...`);
    try {
      await worker.close();
      await closeQueue();
      await disconnectDatabase();
      await disconnectRedis();
    } catch (err) {
      logger.error("Worker shutdown error", { message: err.message });
    } finally {
      process.exit(0);
    }
  };

  ["SIGINT", "SIGTERM"].forEach((sig) =>
    process.on(sig, () => shutdown(sig))
  );

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection in worker", { reason: String(reason) });
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception in worker", {
      message: err.message,
      stack: err.stack,
    });
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start worker", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
