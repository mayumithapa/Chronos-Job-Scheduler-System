const email = require("./email.handler");
const webhook = require("./webhook.handler");
const log = require("./log.handler");
const custom = require("./custom.handler");

const handlers = {
  EMAIL: email,
  WEBHOOK: webhook,
  LOG: log,
  CUSTOM: custom,
};

function getHandler(type) {
  const handler = handlers[type];
  if (!handler) {
    throw new Error(`No handler registered for job type: ${type}`);
  }
  return handler;
}

module.exports = { getHandler, handlers };
