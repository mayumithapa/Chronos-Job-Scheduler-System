import { NavLink } from "react-router-dom";
import { cn } from "../utils/cn";

const NAV = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l9-9 9 9M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: "/jobs",
    label: "Jobs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path strokeLinecap="round" d="M3 9h18M8 14h8M8 17h5" />
      </svg>
    ),
  },
  {
    to: "/jobs/create",
    label: "Create Job",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden",
          open ? "block" : "hidden"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed lg:sticky top-0 lg:top-[57px] left-0 z-40 lg:z-auto",
          "h-screen lg:h-[calc(100vh-57px)] w-64 shrink-0",
          "border-r border-slate-200 dark:border-slate-800",
          "bg-white dark:bg-slate-950",
          "transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col gap-1 p-4">
          <p className="px-2 pb-2 text-xs uppercase tracking-wider font-semibold text-slate-400">
            Navigation
          </p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/jobs"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                )
              }
            >
              <span className="text-current">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="mt-auto rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Bull Board
            </p>
            <p className="mt-1">
              Live queue UI at{" "}
              <a
                href="/admin/queues"
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 dark:text-brand-300 hover:underline"
              >
                /admin/queues
              </a>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
