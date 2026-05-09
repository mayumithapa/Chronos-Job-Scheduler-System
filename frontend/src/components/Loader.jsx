import { cn } from "../utils/cn";

export default function Loader({ size = "md", className, label }) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-[3px]",
  };
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "inline-block animate-spin rounded-full border-slate-300 border-t-brand-600",
          sizes[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {label && (
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      )}
    </div>
  );
}
