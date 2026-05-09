import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import FormInput from "../components/FormInput";
import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await register(form);
      toast.success(`Account created — welcome, ${user.name}!`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.userMessage || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-brand-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Start scheduling jobs in seconds.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <FormInput
            label="Name"
            name="name"
            placeholder="Ada Lovelace"
            value={form.name}
            onChange={onChange}
            minLength={2}
            required
          />
          <FormInput
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={onChange}
            required
          />
          <FormInput
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={onChange}
            minLength={8}
            required
          />
          <button
            type="submit"
            disabled={submitting || loading}
            className="btn btn-primary w-full"
          >
            {submitting ? <Loader size="sm" /> : "Create account"}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-brand-600 dark:text-brand-300 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
