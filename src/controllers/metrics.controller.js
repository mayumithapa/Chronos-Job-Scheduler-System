const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const metricsService = require("../services/metrics.service");

const overview = asyncHandler(async (_req, res) => {
  const data = await metricsService.getOverview();
  return ApiResponse.success(res, data);
});

const recentRuns = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const data = await metricsService.getRecentRuns(limit);
  return ApiResponse.success(res, data);
});

module.exports = { overview, recentRuns };
