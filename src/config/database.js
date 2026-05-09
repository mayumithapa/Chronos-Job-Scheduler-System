const { PrismaClient } = require("@prisma/client");
const env = require("./env");
const logger = require("./logger");

const prisma = new PrismaClient({
  log: env.isDev
    ? [
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
      ]
    : [{ emit: "event", level: "error" }],
});

prisma.$on?.("warn", (event) => logger.warn("[prisma]", event));
prisma.$on?.("error", (event) => logger.error("[prisma]", event));

async function connectDatabase() {
  await prisma.$connect();
  logger.info("PostgreSQL connection established");
}

async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info("PostgreSQL connection closed");
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
