import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import FormInput from "../components/FormInput";
import Loader from "../components/Loader";
import { jobsApi } from "../api/jobs.api";
import { useToast } from "../hooks/useToast";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../utils/formatDate";

const CRON_PRESETS = [
  { label: "Custom", value: "" },
  { label: "Every minute", value: "* * * * *" },
  { label: "Hourly (top of the hour)", value: "0 * * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Weekly on Monday 09:00", value: "0 9 * * 1" },
  { label: "Monthly on the 1st", value: "0 0 1 * *" },
];

export default function RescheduleJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [recurring, setRecurring] = useState(false);
  const [cron, setCron] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const j = await jobsApi.get(id);
        setJob(j);
        if (j.cronExpression) {
          setRecurring(true);
          setCron(j.cronExpression);
        } else if (j.scheduledAt) {
          setScheduledAt(toDatetimeLocalValue(j.scheduledAt));
        }
      } catch (err) {
        toast.error(err.userMessage || "Failed to load job");
        navigate("/jobs", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, toast]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (recurring) {
      if (!cron.trim()) nextErrors.cron = "Cron expression is required";
    } else if (!scheduledAt) {
      nextErrors.scheduledAt = "Pick a date/time";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const body = recurring
      ? { cron: cron.trim() }
      : { scheduledAt: fromDatetimeLocalValue(scheduledAt) };

    setSubmitting(true);
    try {
      await jobsApi.reschedule(id, body);
      toast.success("Job rescheduled");
      navigate(`/jobs/${id}`);
    } catch (err) {
      toast.error(err.userMessage || "Failed to reschedule");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-12 grid place-items-center">
        <Loader size="lg" label="Loading job..." />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <Link
          to={`/jobs/${id}`}
          className="text-sm text-brand-600 dark:text-brand-300 hover:underline"
        >
          ← Back to job
        </Link>
        <h1 className="text-2xl font-bold mt-1">Reschedule job</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Update when "{job.name}" runs.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
          <div>
            <p className="font-medium">Recurring schedule</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between one-time scheduledAt and a cron schedule.
            </p>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm">Recurring</span>
          </label>
        </div>

        {recurring ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              as="select"
              label="Preset"
              name="cronPreset"
              value=""
              onChange={(e) => e.target.value && setCron(e.target.value)}
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
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              error={errors.cron}
            />
          </div>
        ) : (
          <FormInput
            label="Scheduled time"
            name="scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            error={errors.scheduledAt}
            hint="Local time. Will be converted to UTC."
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Link to={`/jobs/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? <Loader size="sm" /> : "Save schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}
