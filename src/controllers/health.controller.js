const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/database");
const { redisConnection } = require("../config/redis");

const live = (_req, res) =>
  ApiResponse.success(res, {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });

const ready = asyncHandler(async (_req, res) => {
  const checks = { database: "unknown", redis: "unknown" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (err) {
    checks.database = `down: ${err.message}`;
  }

  try {
    const pong = await redisConnection.ping();
    checks.redis = pong === "PONG" ? "ok" : "unexpected: " + pong;
  } catch (err) {
    checks.redis = `down: ${err.message}`;
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  return ApiResponse.success(
    res,
    { status: allOk ? "ok" : "degraded", checks },
    { statusCode: allOk ? 200 : 503 }
  );
});

module.exports = { live, ready };
