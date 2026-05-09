import { cn } from "../utils/cn";

const TONES = {
  default:
    "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
  success:
    "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
  danger:
    "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900",
  info: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900",
  warning:
    "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900",
  brand:
    "bg-brand-50 dark:bg-brand-900/40 border-brand-200 dark:border-brand-900",
};

const ACCENT = {
  default: "text-slate-700 dark:text-slate-300",
  success: "text-emerald-700 dark:text-emerald-300",
  danger: "text-rose-700 dark:text-rose-300",
  info: "text-sky-700 dark:text-sky-300",
  warning: "text-amber-700 dark:text-amber-300",
  brand: "text-brand-700 dark:text-brand-300",
};

export default function MetricsCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-card transition hover:shadow-md",
        TONES[tone]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={cn(
              "text-xs uppercase tracking-wider font-semibold",
              ACCENT[tone]
            )}
          >
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {value ?? "—"}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {hint}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn("opacity-80", ACCENT[tone])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
