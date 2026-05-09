const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const env = require("./env");
const { jobQueue } = require("../queues/jobQueue");

function buildBullBoardRouter() {
  if (!env.bullBoard.enabled) return null;

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(env.bullBoard.path);

  createBullBoard({
    queues: [new BullMQAdapter(jobQueue)],
    serverAdapter,
  });

  return serverAdapter;
}

module.exports = buildBullBoardRouter;
