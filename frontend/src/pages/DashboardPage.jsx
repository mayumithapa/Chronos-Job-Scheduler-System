import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import JobStatusBadge from "../components/JobStatusBadge";
import Loader from "../components/Loader";
import MetricsCard from "../components/MetricsCard";
import { metricsApi } from "../api/metrics.api";
import { useToast } from "../hooks/useToast";
import { formatDate, formatDuration, formatRelative } from "../utils/formatDate";

const REFRESH_MS = 10_000;

export default function DashboardPage() {
  const toast = useToast();
  const [metrics, setMetrics] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [m, runs] = await Promise.all([
        metricsApi.overview(),
        metricsApi.recentRuns({ limit: 10 }),
      ]);
      setMetrics(m);
      setRecent(runs);
    } catch (err) {
      toast.error(err.userMessage || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const successRate = useMemo(() => {
    if (!metrics?.runs) return null;
    return metrics.runs.successRate;
  }, [metrics]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Live overview of jobs, queue health, and recent runs.
          </p>
        </div>
        <Link to="/jobs/create" className="btn btn-primary">
          + New job
        </Link>
      </header>

      {loading && !metrics ? (
        <div className="card p-12 grid place-items-center">
          <Loader size="lg" label="Loading metrics..." />
        </div>
      ) : (
        <>
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricsCard
              tone="brand"
              label="Total jobs"
              value={metrics?.totalJobs ?? 0}
              hint={`${metrics?.queuedJobs ?? 0} queued, ${metrics?.pendingJobs ?? 0} pending`}
            />
            <MetricsCard
              tone="warning"
              label="Running"
              value={metrics?.runningJobs ?? 0}
              hint="Currently executing"
            />
            <MetricsCard
              tone="success"
              label="Successful"
              value={metrics?.successfulJobs ?? 0}
              hint={successRate != null ? `${successRate}% run success rate` : undefined}
            />
            <MetricsCard
              tone="danger"
              label="Failed"
              value={metrics?.failedJobs ?? 0}
              hint={
                metrics?.runs?.failed != null
                  ? `${metrics.runs.failed} failed runs total`
                  : undefined
              }
            />
            <MetricsCard
              tone="info"
              label="Queued"
              value={metrics?.queuedJobs ?? 0}
              hint={`${metrics?.pausedJobs ?? 0} paused, ${metrics?.cancelledJobs ?? 0} cancelled`}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-1">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Live queue
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Waiting</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {metrics?.queue?.waiting ?? 0}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">Active</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {metrics?.queue?.active ?? 0}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">Delayed</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {metrics?.queue?.delayed ?? 0}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">Completed</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {metrics?.queue?.completed ?? 0}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">Failed</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {metrics?.queue?.failed ?? 0}
                </dd>
              </dl>
              <p className="mt-4 text-xs text-slate-400">
                Refreshed every {REFRESH_MS / 1000}s
              </p>
            </div>

            <div className="card p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Recent runs
              </h2>
              {!recent?.length ? (
                <EmptyState
                  title="No runs yet"
                  description="Create a job to see its execution history here."
                  action={
                    <Link to="/jobs/create" className="btn btn-primary">
                      Schedule your first job
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recent.map((run) => (
                    <li key={run.id} className="py-3 flex items-center gap-3">
                      <JobStatusBadge status={run.status} />
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/jobs/${run.job?.id ?? run.jobId}`}
                          className="font-medium hover:underline truncate block"
                        >
                          {run.job?.name ?? "(deleted job)"}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          attempt #{run.attemptNumber} ·{" "}
                          {formatDuration(run.executionTime)} ·{" "}
                          <span title={formatDate(run.startedAt)}>
                            {formatRelative(run.startedAt)}
                          </span>
                        </p>
                        {run.errorMessage && (
                          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 truncate">
                            {run.errorMessage}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
