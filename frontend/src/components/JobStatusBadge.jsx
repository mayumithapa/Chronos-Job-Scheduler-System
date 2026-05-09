import { cn } from "../utils/cn";

const STATUS_STYLES = {
  PENDING:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  QUEUED:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900",
  RUNNING:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  SUCCESS:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  FAILED:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
  CANCELLED:
    "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
  PAUSED:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-900",
};

const DOT = {
  PENDING: "bg-slate-400",
  QUEUED: "bg-sky-500",
  RUNNING: "bg-amber-500 animate-pulse",
  SUCCESS: "bg-emerald-500",
  FAILED: "bg-rose-500",
  CANCELLED: "bg-slate-400",
  PAUSED: "bg-violet-500",
};

export default function JobStatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  return (
    <span className={cn("badge", cls)}>
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          DOT[status] || DOT.PENDING
        )}
      />
      {status}
    </span>
  );
}
