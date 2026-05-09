const swaggerJsdoc = require("swagger-jsdoc");
const env = require("./env");

const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Chronos API",
      version: "1.0.0",
      description:
        "Chronos is a distributed job scheduler. Schedule one-time and recurring jobs, monitor execution and retries.",
    },
    servers: [{ url: env.apiBasePath, description: "Current server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
});

module.exports = spec;
