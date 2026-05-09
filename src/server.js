const env = require("./config/env");
const logger = require("./config/logger");
const createApp = require("./app");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { closeQueue } = require("./queues/jobQueue");
const { disconnectRedis } = require("./config/redis");

async function bootstrap() {
  await connectDatabase();
  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`Chronos API listening on http://localhost:${env.port}`);
    logger.info(`Docs: http://localhost:${env.port}${env.apiBasePath}/docs`);
    if (env.bullBoard.enabled) {
      logger.info(
        `Bull Board: http://localhost:${env.port}${env.bullBoard.path}`
      );
    }
  });

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => logger.info("HTTP server closed"));
    try {
      await closeQueue();
      await disconnectDatabase();
      await disconnectRedis();
    } catch (err) {
      logger.error("Error during shutdown", { message: err.message });
    } finally {
      process.exit(0);
    }
  };

  ["SIGINT", "SIGTERM"].forEach((sig) =>
    process.on(sig, () => shutdown(sig))
  );

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason: String(reason) });
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { message: err.message, stack: err.stack });
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start Chronos API", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
