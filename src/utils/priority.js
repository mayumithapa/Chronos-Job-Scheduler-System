// BullMQ uses numeric priorities where lower = more important.
const PRIORITY_TO_BULL = {
  CRITICAL: 1,
  HIGH: 5,
  NORMAL: 10,
  LOW: 20,
};

function toBullPriority(priority) {
  return PRIORITY_TO_BULL[priority] ?? PRIORITY_TO_BULL.NORMAL;
}

module.exports = { toBullPriority, PRIORITY_TO_BULL };
