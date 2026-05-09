const express = require("express");
const authRoutes = require("./auth.routes");
const jobsRoutes = require("./jobs.routes");
const metricsRoutes = require("./metrics.routes");
const healthRoutes = require("./health.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/jobs", jobsRoutes);
router.use("/metrics", metricsRoutes);

module.exports = router;
