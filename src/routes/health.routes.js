const express = require("express");
const healthController = require("../controllers/health.controller");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Liveness and readiness probes
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     responses:
 *       200: { description: Server is alive }
 */
router.get("/", healthController.live);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe (checks DB and Redis)
 *     responses:
 *       200: { description: All dependencies are healthy }
 *       503: { description: One or more dependencies are unhealthy }
 */
router.get("/ready", healthController.ready);

module.exports = router;
