const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");

const env = require("./config/env");
const swaggerSpec = require("./config/swagger");
const buildBullBoardRouter = require("./config/bullBoard");
const requestLogger = require("./middleware/requestLogger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const apiRouter = require("./routes");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Generic per-IP rate limiter for the public API surface
  app.use(
    env.apiBasePath,
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Welcome route
  app.get("/", (_req, res) =>
    res.json({
      name: "Chronos",
      description: "Distributed Job Scheduler",
      version: "1.0.0",
      docs: `${env.apiBasePath}/docs`,
      health: `${env.apiBasePath}/health`,
      bullBoard: env.bullBoard.enabled ? env.bullBoard.path : null,
    })
  );

  // Swagger docs
  app.use(
    `${env.apiBasePath}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Chronos API Docs",
    })
  );
  app.get(`${env.apiBasePath}/docs.json`, (_req, res) => res.json(swaggerSpec));

  // Bull Board admin UI
  const bullBoardRouter = buildBullBoardRouter();
  if (bullBoardRouter) {
    app.use(env.bullBoard.path, bullBoardRouter.getRouter());
  }

  // API
  app.use(env.apiBasePath, apiRouter);

  // 404 + error handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
