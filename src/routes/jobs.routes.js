const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const jobsController = require("../controllers/jobs.controller");
const {
  createJobSchema,
  updateJobSchema,
  rescheduleSchema,
  listJobsQuerySchema,
  idParamsSchema,
} = require("../validators/jobs.validator");

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: Job scheduling and management
 */

/**
 * @swagger
 * /jobs:
 *   post:
 *     tags: [Jobs]
 *     summary: Create a one-time or recurring job
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Send Weekly Report" }
 *               type:
 *                 type: string
 *                 enum: [EMAIL, WEBHOOK, LOG, CUSTOM]
 *                 example: EMAIL
 *               payload:
 *                 type: object
 *                 example: { email: "test@example.com", subject: "hi" }
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-01-20T10:00:00Z"
 *               cron:
 *                 type: string
 *                 example: "0 0 * * *"
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, CRITICAL]
 *               maxRetries:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 20
 *     responses:
 *       201: { description: Job created and scheduled }
 *
 *   get:
 *     tags: [Jobs]
 *     summary: List jobs for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, QUEUED, RUNNING, SUCCESS, FAILED, CANCELLED, PAUSED] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [EMAIL, WEBHOOK, LOG, CUSTOM] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Paginated list of jobs }
 */
router
  .route("/")
  .post(validate({ body: createJobSchema }), jobsController.create)
  .get(validate({ query: listJobsQuerySchema }), jobsController.list);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get a job by id (with recent runs)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Job details }
 *       404: { description: Not found }
 *
 *   patch:
 *     tags: [Jobs]
 *     summary: Update job fields and/or reschedule
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               payload: { type: object }
 *               priority: { type: string, enum: [LOW, NORMAL, HIGH, CRITICAL] }
 *               maxRetries: { type: integer }
 *               scheduledAt: { type: string, format: date-time }
 *               cron: { type: string }
 *     responses:
 *       200: { description: Updated job }
 */
router
  .route("/:id")
  .get(validate({ params: idParamsSchema }), jobsController.getOne)
  .patch(
    validate({ params: idParamsSchema, body: updateJobSchema }),
    jobsController.update
  );

/**
 * @swagger
 * /jobs/{id}/cancel:
 *   post:
 *     tags: [Jobs]
 *     summary: Cancel a pending or queued job
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Job cancelled }
 */
router.post(
  "/:id/cancel",
  validate({ params: idParamsSchema }),
  jobsController.cancel
);

/**
 * @swagger
 * /jobs/{id}/pause:
 *   post:
 *     tags: [Jobs]
 *     summary: Pause a job (removes it from the queue but keeps the record)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Job paused }
 */
router.post(
  "/:id/pause",
  validate({ params: idParamsSchema }),
  jobsController.pause
);

/**
 * @swagger
 * /jobs/{id}/resume:
 *   post:
 *     tags: [Jobs]
 *     summary: Resume a paused job (re-enqueue it)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Job resumed }
 */
router.post(
  "/:id/resume",
  validate({ params: idParamsSchema }),
  jobsController.resume
);

/**
 * @swagger
 * /jobs/{id}/reschedule:
 *   post:
 *     tags: [Jobs]
 *     summary: Reschedule a job (set a new scheduledAt or cron)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduledAt: { type: string, format: date-time }
 *               cron: { type: string }
 *     responses:
 *       200: { description: Job rescheduled }
 */
router.post(
  "/:id/reschedule",
  validate({ params: idParamsSchema, body: rescheduleSchema }),
  jobsController.reschedule
);

/**
 * @swagger
 * /jobs/{id}/runs:
 *   get:
 *     tags: [Jobs]
 *     summary: Get execution history for a job
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Paginated list of runs }
 */
router.get(
  "/:id/runs",
  validate({ params: idParamsSchema }),
  jobsController.runs
);

module.exports = router;
