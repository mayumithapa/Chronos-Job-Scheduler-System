import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import FormInput from "../components/FormInput";
import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [form, setForm] = useState({
    email: "demo@chronos.local",
    password: "demo12345",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.userMessage || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-brand-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Welcome to Chronos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Schedule, monitor, and retry distributed jobs.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <FormInput
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={onChange}
            required
          />
          <FormInput
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={onChange}
            required
          />
          <button
            type="submit"
            disabled={submitting || loading}
            className="btn btn-primary w-full"
          >
            {submitting ? <Loader size="sm" /> : "Sign in"}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            New here?{" "}
            <Link
              to="/register"
              className="font-medium text-brand-600 dark:text-brand-300 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Default seeded user: <code>demo@chronos.local</code> /{" "}
          <code>demo12345</code>
        </p>
      </div>
    </div>
  );
}
