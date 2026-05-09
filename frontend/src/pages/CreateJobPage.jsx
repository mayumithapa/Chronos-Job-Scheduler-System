import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import FormInput from "../components/FormInput";
import Loader from "../components/Loader";
import { jobsApi } from "../api/jobs.api";
import { useToast } from "../hooks/useToast";
import { fromDatetimeLocalValue } from "../utils/formatDate";

const TYPES = ["LOG", "EMAIL", "WEBHOOK", "CUSTOM"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

const SAMPLE_PAYLOADS = {
  LOG: { message: "Hello from Chronos" },
  EMAIL: {
    to: "test@example.com",
    subject: "Hello from Chronos",
    text: "Scheduled with love.",
  },
  WEBHOOK: {
    url: "https://example.com/hook",
    method: "POST",
    body: { event: "ping" },
  },
  CUSTOM: { fail: false, delayMs: 0 },
};

const CRON_PRESETS = [
  { label: "Custom", value: "" },
  { label: "Every minute", value: "* * * * *" },
  { label: "Hourly (top of the hour)", value: "0 * * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Weekly on Monday 09:00", value: "0 9 * * 1" },
  { label: "Monthly on the 1st", value: "0 0 1 * *" },
];

export default function CreateJobPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    type: "LOG",
    priority: "NORMAL",
    maxRetries: 3,
    payloadText: JSON.stringify(SAMPLE_PAYLOADS.LOG, null, 2),
    recurring: false,
    cron: "",
    cronPreset: "",
    scheduledAt: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const onTypeChange = (e) => {
    const next = e.target.value;
    const sample = SAMPLE_PAYLOADS[next] ?? {};
    setForm((prev) => ({
      ...prev,
      type: next,
      payloadText: JSON.stringify(sample, null, 2),
    }));
  };

  const onCronPresetChange = (e) => {
    const value = e.target.value;
    setField("cronPreset", value);
    if (value) setField("cron", value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Name is required";

    let payload = {};
    if (form.payloadText.trim()) {
      try {
        payload = JSON.parse(form.payloadText);
        if (typeof payload !== "object" || Array.isArray(payload)) {
          throw new Error("Payload must be a JSON object");
        }
      } catch (err) {
        nextErrors.payloadText = err.message;
      }
    }

    if (form.recurring) {
      if (!form.cron.trim()) nextErrors.cron = "Cron expression is required";
    } else if (!form.scheduledAt) {
      nextErrors.scheduledAt = "Pick a date/time or check Recurring";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const body = {
      name: form.name.trim(),
      type: form.type,
      priority: form.priority,
      maxRetries: Number(form.maxRetries),
      payload,
    };

    if (form.recurring) {
      body.cron = form.cron.trim();
    } else {
      body.scheduledAt = fromDatetimeLocalValue(form.scheduledAt);
    }

    setSubmitting(true);
    try {
      const job = await jobsApi.create(body);
      toast.success(`Job "${job.name}" scheduled`);
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      toast.error(err.userMessage || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create job</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Schedule a one-time or recurring job.
          </p>
        </div>
        <Link to="/jobs" className="btn btn-ghost">
          ← Back to jobs
        </Link>
      </header>

      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        <FormInput
          label="Job name"
          name="name"
          placeholder="Send Weekly Report"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          error={errors.name}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput
            as="select"
            label="Type"
            name="type"
            value={form.type}
            onChange={onTypeChange}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FormInput>

          <FormInput
            as="select"
            label="Priority"
            name="priority"
            value={form.priority}
            onChange={(e) => setField("priority", e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </FormInput>

          <FormInput
            label="Max retries"
            type="number"
            name="maxRetries"
            min={0}
            max={20}
            value={form.maxRetries}
            onChange={(e) => setField("maxRetries", e.target.value)}
          />
        </div>

        <FormInput
          as="textarea"
          rows={8}
          label="Payload (JSON)"
          name="payloadText"
          value={form.payloadText}
          onChange={(e) => setField("payloadText", e.target.value)}
          hint='Plain JSON object. Examples: { "to": "..." } for EMAIL, { "url": "..." } for WEBHOOK.'
          error={errors.payloadText}
        />

        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
          <div>
            <p className="font-medium">Recurring schedule</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use a cron expression to run the job on a repeating schedule.
            </p>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setField("recurring", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm">Recurring</span>
          </label>
        </div>

        {form.recurring ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              as="select"
              label="Preset"
              name="cronPreset"
              value={form.cronPreset}
              onChange={onCronPresetChange}
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.label} value={p.value}>
                  {p.label}
                </option>
              ))}
            </FormInput>
            <FormInput
              label="Cron expression"
              name="cron"
              placeholder="0 9 * * *"
              value={form.cron}
              onChange={(e) => setField("cron", e.target.value)}
              hint="Standard 5-field cron syntax: minute hour day month weekday"
              error={errors.cron}
            />
          </div>
        ) : (
          <FormInput
            label="Scheduled time"
            name="scheduledAt"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setField("scheduledAt", e.target.value)}
            error={errors.scheduledAt}
            hint="Local time. Will be converted to UTC before sending."
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Link to="/jobs" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? <Loader size="sm" /> : "Schedule job"}
          </button>
        </div>
      </form>
    </div>
  );
}
