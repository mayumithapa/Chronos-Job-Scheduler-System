const morgan = require("morgan");
const logger = require("../config/logger");

const stream = {
  write: (message) => logger.http?.(message.trim()) ?? logger.info(message.trim()),
};

const skip = (req) => req.path === "/api/v1/health" || req.path === "/health";

module.exports = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream, skip }
);
