import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import JobStatusBadge from "../components/JobStatusBadge";
import Loader from "../components/Loader";
import { jobsApi } from "../api/jobs.api";
import { useToast } from "../hooks/useToast";
import { formatDate, formatDuration, formatRelative } from "../utils/formatDate";

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [job, setJob] = useState(null);
  const [runs, setRuns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [j, r] = await Promise.all([
        jobsApi.get(id),
        jobsApi.runs(id, { page: 1, pageSize: 25 }),
      ]);
      setJob(j);
      setRuns(r);
    } catch (err) {
      toast.error(err.userMessage || "Failed to load job");
      if (err.response?.status === 404) navigate("/jobs", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 8_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const action = async (kind) => {
    if (kind === "cancel" && !window.confirm(`Cancel "${job.name}"?`)) return;
    setWorking(true);
    try {
      if (kind === "cancel") await jobsApi.cancel(id);
      else if (kind === "pause") await jobsApi.pause(id);
      else if (kind === "resume") await jobsApi.resume(id);
      toast.success(`Job ${kind}ed`);
      await fetchAll();
    } catch (err) {
      toast.error(err.userMessage || `Failed to ${kind} job`);
    } finally {
      setWorking(false);
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Link to="/jobs" className="text-sm text-brand-600 dark:text-brand-300 hover:underline">
            ← Back to jobs
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{job.name}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-xs font-mono text-slate-400 break-all">{job.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/jobs/${job.id}/reschedule`} className="btn btn-secondary">
            Reschedule
          </Link>
          {["PENDING", "QUEUED"].includes(job.status) && (
            <button
              type="button"
              onClick={() => action("pause")}
              disabled={working}
              className="btn btn-secondary"
            >
              Pause
            </button>
          )}
          {job.status === "PAUSED" && (
            <button
              type="button"
              onClick={() => action("resume")}
              disabled={working}
              className="btn btn-secondary"
            >
              Resume
            </button>
          )}
          {!["SUCCESS", "CANCELLED"].includes(job.status) && (
            <button
              type="button"
              onClick={() => action("cancel")}
              disabled={working}
              className="btn btn-danger"
            >
              Cancel
            </button>
          )}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 space-y-3 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Job info
          </h2>
          <DefRow label="Type" value={job.type} />
          <DefRow label="Priority" value={job.priority} />
          <DefRow
            label="Schedule"
            value={
              job.cronExpression ? (
                <span className="font-mono text-xs">{job.cronExpression}</span>
              ) : (
                <span title={formatDate(job.scheduledAt)}>
                  {formatDate(job.scheduledAt)}
                </span>
              )
            }
          />
          {job.nextRunAt && (
            <DefRow
              label={job.cronExpression ? "Next run" : "Runs"}
              value={
                <span title={formatDate(job.nextRunAt)}>
                  {formatRelative(job.nextRunAt)}
                </span>
              }
            />
          )}
          <DefRow label="Retries" value={`${job.retryCount} / ${job.maxRetries}`} />
          <DefRow
            label="Last error"
            value={
              job.lastError ? (
                <span className="text-rose-600 dark:text-rose-400">
                  {job.lastError}
                </span>
              ) : (
                "—"
              )
            }
          />
          <DefRow
            label="Created"
            value={
              <span title={formatDate(job.createdAt)}>
                {formatRelative(job.createdAt)}
              </span>
            }
          />
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Payload
          </h2>
          <pre className="overflow-auto rounded-lg bg-slate-50 dark:bg-slate-900/70 p-4 text-xs text-slate-800 dark:text-slate-200 ring-1 ring-inset ring-slate-200 dark:ring-slate-800">
            {JSON.stringify(job.payload ?? {}, null, 2)}
          </pre>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-lg font-semibold">Execution history</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {runs?.pagination?.total ?? 0} run(s) · auto-refresh 8s
          </span>
        </div>

        {!runs?.items?.length ? (
          <div className="card">
            <EmptyState
              title="No runs yet"
              description="The job hasn't been picked up by the worker yet."
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Attempt</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Output / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {runs.items.map((run) => (
                    <tr key={run.id}>
                      <td className="px-4 py-3 align-top">
                        <JobStatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        #{run.attemptNumber}
                      </td>
                      <td
                        className="px-4 py-3 align-top text-slate-500 dark:text-slate-400"
                        title={formatDate(run.startedAt)}
                      >
                        {formatRelative(run.startedAt)}
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        {formatDuration(run.executionTime)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {run.errorMessage ? (
                          <p className="text-rose-600 dark:text-rose-400 break-words">
                            {run.errorMessage}
                          </p>
                        ) : run.output ? (
                          <pre className="text-xs text-slate-600 dark:text-slate-300 max-w-md whitespace-pre-wrap break-words">
                            {JSON.stringify(run.output, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function DefRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800 dark:text-slate-200 break-words">
        {value}
      </span>
    </div>
  );
}
