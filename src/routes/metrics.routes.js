const express = require("express");
const { authenticate } = require("../middleware/auth");
const metricsController = require("../controllers/metrics.controller");

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Metrics
 *     description: System and queue metrics
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [Metrics]
 *     summary: Get aggregated job metrics + live queue stats
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Metrics overview }
 */
router.get("/", metricsController.overview);

/**
 * @swagger
 * /metrics/runs:
 *   get:
 *     tags: [Metrics]
 *     summary: Recent job runs across all jobs
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Recent runs }
 */
router.get("/runs", metricsController.recentRuns);

module.exports = router;
