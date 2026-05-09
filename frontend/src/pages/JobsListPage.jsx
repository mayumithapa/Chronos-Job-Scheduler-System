import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import JobsTable from "../components/JobsTable";
import Loader from "../components/Loader";
import { jobsApi } from "../api/jobs.api";
import { useToast } from "../hooks/useToast";

const STATUSES = [
  "ALL",
  "PENDING",
  "QUEUED",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "PAUSED",
];
const TYPES = ["ALL", "EMAIL", "WEBHOOK", "LOG", "CUSTOM"];

export default function JobsListPage() {
  const toast = useToast();
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (status !== "ALL") params.status = status;
      if (type !== "ALL") params.type = type;
      const result = await jobsApi.list(params);
      setData(result);
    } catch (err) {
      toast.error(err.userMessage || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [page, status, type, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleAction = async (action, job) => {
    if (action === "cancel" && !window.confirm(`Cancel "${job.name}"?`)) return;
    try {
      if (action === "cancel") await jobsApi.cancel(job.id);
      else if (action === "pause") await jobsApi.pause(job.id);
      else if (action === "resume") await jobsApi.resume(job.id);
      toast.success(`Job ${action}ed`);
      fetchJobs();
    } catch (err) {
      toast.error(err.userMessage || `Failed to ${action} job`);
    }
  };

  const totalPages = data?.pagination?.totalPages ?? 1;
  const items = data?.items ?? [];

  const filterChanged = useMemo(
    () => status !== "ALL" || type !== "ALL",
    [status, type]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse, filter and manage all your scheduled jobs.
          </p>
        </div>
        <Link to="/jobs/create" className="btn btn-primary">
          + New job
        </Link>
      </header>

      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="input"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="label">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="input"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => fetchJobs()}
          className="btn btn-secondary"
        >
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="card p-12 grid place-items-center">
          <Loader size="lg" label="Loading jobs..." />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            title={filterChanged ? "No jobs match your filters" : "No jobs yet"}
            description={
              filterChanged
                ? "Try clearing the filters or adjusting your search."
                : "Schedule your first job to see it here."
            }
            action={
              <Link to="/jobs/create" className="btn btn-primary">
                Create a job
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <JobsTable jobs={items} onAction={handleAction} />

          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              Page {data?.pagination?.page} of {totalPages} ·{" "}
              {data?.pagination?.total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
