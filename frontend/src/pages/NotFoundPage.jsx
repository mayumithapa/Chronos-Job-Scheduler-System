import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div className="max-w-md">
        <p className="text-7xl font-black bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          The page you're looking for doesn't exist or was moved.
        </p>
        <Link to="/dashboard" className="btn btn-primary mt-6">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
