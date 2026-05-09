import { Link } from "react-router-dom";
import JobStatusBadge from "./JobStatusBadge";
import { formatDate, formatRelative } from "../utils/formatDate";

export default function JobsTable({ jobs, onAction }) {
  if (!jobs?.length) {
    return null;
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Retries</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/jobs/${job.id}`}
                    className="font-medium text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    {job.name}
                  </Link>
                  <div className="text-xs text-slate-400 font-mono">
                    {job.id.slice(0, 8)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">
                    {job.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {job.cronExpression ? (
                    <span className="font-mono text-xs">
                      {job.cronExpression}
                    </span>
                  ) : (
                    <span title={formatDate(job.scheduledAt)}>
                      {formatRelative(job.scheduledAt)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {job.retryCount}/{job.maxRetries}
                </td>
                <td
                  className="px-4 py-3 text-slate-500 dark:text-slate-400"
                  title={formatDate(job.createdAt)}
                >
                  {formatRelative(job.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="btn btn-ghost px-2 py-1 text-xs"
                    >
                      View
                    </Link>
                    {["PENDING", "QUEUED"].includes(job.status) && (
                      <button
                        type="button"
                        className="btn btn-ghost px-2 py-1 text-xs"
                        onClick={() => onAction?.("pause", job)}
                      >
                        Pause
                      </button>
                    )}
                    {job.status === "PAUSED" && (
                      <button
                        type="button"
                        className="btn btn-ghost px-2 py-1 text-xs"
                        onClick={() => onAction?.("resume", job)}
                      >
                        Resume
                      </button>
                    )}
                    {!["SUCCESS", "CANCELLED"].includes(job.status) && (
                      <button
                        type="button"
                        className="btn btn-ghost px-2 py-1 text-xs text-rose-600 dark:text-rose-400"
                        onClick={() => onAction?.("cancel", job)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
