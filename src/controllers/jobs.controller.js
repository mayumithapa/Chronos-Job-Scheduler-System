const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const jobsService = require("../services/jobs.service");

const create = asyncHandler(async (req, res) => {
  const job = await jobsService.createJob(req.user.id, req.body);
  return ApiResponse.success(res, job, {
    statusCode: 201,
    message: "Job scheduled",
  });
});

const list = asyncHandler(async (req, res) => {
  const data = await jobsService.listJobs(req.user.id, req.query);
  return ApiResponse.success(res, data);
});

const getOne = asyncHandler(async (req, res) => {
  const job = await jobsService.getJob(req.user.id, req.params.id);
  return ApiResponse.success(res, job);
});

const update = asyncHandler(async (req, res) => {
  const job = await jobsService.updateJob(req.user.id, req.params.id, req.body);
  return ApiResponse.success(res, job, { message: "Job updated" });
});

const cancel = asyncHandler(async (req, res) => {
  const job = await jobsService.cancelJob(req.user.id, req.params.id);
  return ApiResponse.success(res, job, { message: "Job cancelled" });
});

const pause = asyncHandler(async (req, res) => {
  const job = await jobsService.pauseJob(req.user.id, req.params.id);
  return ApiResponse.success(res, job, { message: "Job paused" });
});

const resume = asyncHandler(async (req, res) => {
  const job = await jobsService.resumeJob(req.user.id, req.params.id);
  return ApiResponse.success(res, job, { message: "Job resumed" });
});

const reschedule = asyncHandler(async (req, res) => {
  const job = await jobsService.rescheduleJob(
    req.user.id,
    req.params.id,
    req.body
  );
  return ApiResponse.success(res, job, { message: "Job rescheduled" });
});

const runs = asyncHandler(async (req, res) => {
  const data = await jobsService.listRuns(req.user.id, req.params.id, {
    page: Number(req.query.page) || 1,
    pageSize: Math.min(Number(req.query.pageSize) || 20, 100),
  });
  return ApiResponse.success(res, data);
});

module.exports = {
  create,
  list,
  getOne,
  update,
  cancel,
  pause,
  resume,
  reschedule,
  runs,
};
