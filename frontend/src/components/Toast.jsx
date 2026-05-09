import { cn } from "../utils/cn";

const styles = {
  success:
    "bg-emerald-600/95 text-white ring-emerald-700",
  error: "bg-rose-600/95 text-white ring-rose-700",
  info: "bg-slate-900/95 text-white ring-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-200",
};

export default function Toast({ toast, onClose }) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg ring-1 ring-inset min-w-[260px] max-w-sm animate-[fadeIn_.15s_ease-out]",
        styles[toast.type] || styles.info
      )}
    >
      <span className="text-sm leading-5 flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white text-sm"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
