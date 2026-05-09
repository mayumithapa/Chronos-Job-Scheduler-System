/* eslint-disable no-console */
// Quick sanity check: pings Postgres + Redis using the configured env.
// Exits non-zero if either is unreachable.

require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const IORedis = require("ioredis");

async function checkPostgres() {
  const prisma = new PrismaClient();
  try {
    const t0 = Date.now();
    const rows = await prisma.$queryRaw`SELECT 1 AS ok, current_database() AS db, version() AS version`;
    console.log(
      `Postgres ok (${Date.now() - t0}ms) -> db=${rows[0].db}, version=${String(
        rows[0].version
      ).split(",")[0]}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function checkRedis() {
  const url = process.env.REDIS_URL;
  const redis = url
    ? new IORedis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 8000,
        lazyConnect: true,
      })
    : new IORedis({
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
        maxRetriesPerRequest: 1,
        connectTimeout: 8000,
        lazyConnect: true,
      });

  try {
    const t0 = Date.now();
    await redis.connect();
    const pong = await redis.ping();
    console.log(`Redis ok    (${Date.now() - t0}ms) -> ${pong}`);
  } finally {
    redis.disconnect();
  }
}

(async () => {
  let failed = 0;

  try {
    await checkPostgres();
  } catch (err) {
    failed++;
    console.error("Postgres FAILED ->", err.message);
  }

  try {
    await checkRedis();
  } catch (err) {
    failed++;
    console.error("Redis FAILED ->", err.message);
  }

  process.exit(failed ? 1 : 0);
})();
