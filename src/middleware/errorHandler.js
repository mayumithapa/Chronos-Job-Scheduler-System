const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const logger = require("../config/logger");
const env = require("../config/env");

function notFoundHandler(req, res) {
  return ApiResponse.error(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return ApiResponse.error(res, 400, "Validation failed", err.flatten());
  }

  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.statusCode, err.message, err.details);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return ApiResponse.error(res, 409, "Resource already exists", {
        target: err.meta?.target,
      });
    }
    if (err.code === "P2025") {
      return ApiResponse.error(res, 404, "Resource not found");
    }
  }

  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
  });

  return ApiResponse.error(
    res,
    500,
    "Internal Server Error",
    env.isProd ? undefined : { message: err.message }
  );
}

module.exports = { errorHandler, notFoundHandler };
