const { z } = require("zod");
const cronParser = require("cron-parser");

const JOB_TYPES = ["EMAIL", "WEBHOOK", "LOG", "CUSTOM"];
const JOB_PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"];
const JOB_STATUSES = [
  "PENDING",
  "QUEUED",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "PAUSED",
];

const cronSchema = z
  .string()
  .min(9)
  .max(120)
  .refine(
    (value) => {
      try {
        cronParser.parseExpression(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid cron expression" }
  );

const isoDateSchema = z
  .string()
  .datetime({ message: "scheduledAt must be a valid ISO-8601 datetime" });

const baseJobShape = {
  name: z.string().trim().min(2).max(180),
  type: z.enum(JOB_TYPES).default("LOG"),
  payload: z.record(z.any()).optional().default({}),
  priority: z.enum(JOB_PRIORITIES).optional().default("NORMAL"),
  maxRetries: z.number().int().min(0).max(20).optional(),
};

const createJobSchema = z
  .object({
    ...baseJobShape,
    scheduledAt: isoDateSchema.optional(),
    cron: cronSchema.optional(),
  })
  .refine((data) => !(data.scheduledAt && data.cron), {
    message: "Provide either scheduledAt or cron, not both",
    path: ["cron"],
  });

const updateJobSchema = z
  .object({
    name: baseJobShape.name.optional(),
    payload: baseJobShape.payload.optional(),
    priority: z.enum(JOB_PRIORITIES).optional(),
    maxRetries: baseJobShape.maxRetries,
    scheduledAt: isoDateSchema.optional(),
    cron: cronSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  })
  .refine((data) => !(data.scheduledAt && data.cron), {
    message: "Provide either scheduledAt or cron, not both",
    path: ["cron"],
  });

const rescheduleSchema = z
  .object({
    scheduledAt: isoDateSchema.optional(),
    cron: cronSchema.optional(),
  })
  .refine((data) => data.scheduledAt || data.cron, {
    message: "Provide scheduledAt or cron",
  })
  .refine((data) => !(data.scheduledAt && data.cron), {
    message: "Provide either scheduledAt or cron, not both",
    path: ["cron"],
  });

const listJobsQuerySchema = z.object({
  status: z.enum(JOB_STATUSES).optional(),
  type: z.enum(JOB_TYPES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const idParamsSchema = z.object({
  id: z.string().uuid("Invalid job id"),
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  rescheduleSchema,
  listJobsQuerySchema,
  idParamsSchema,
  JOB_TYPES,
  JOB_PRIORITIES,
  JOB_STATUSES,
};
