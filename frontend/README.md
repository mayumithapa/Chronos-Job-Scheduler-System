# Chronos Frontend

React + Vite + Tailwind dashboard for the [Chronos](../README.md) distributed job scheduler.

## Stack

- **React 18** + **Vite 5**
- **Tailwind CSS 3** (dark-mode ready)
- **React Router 6**
- **Axios** with a single shared client + JWT interceptor
- **React Context API** for auth + toasts

## Pages

| Route | Page | Notes |
| --- | --- | --- |
| `/login` | Login | JWT-based, prefilled with the seeded demo user |
| `/register` | Register | Creates a new user |
| `/dashboard` | Dashboard | 5 metric cards + live queue stats + recent runs (auto-refresh 10s) |
| `/jobs` | Jobs list | Status / type filters, paginated, inline pause/resume/cancel |
| `/jobs/create` | Create job | One-time *or* recurring (cron) with presets |
| `/jobs/:id` | Job details | Job info, payload, execution history (auto-refresh 8s) |
| `/jobs/:id/reschedule` | Reschedule | Switch between scheduledAt and cron |

## Quick start

```bash
# from repo root
cd frontend
cp .env.example .env       # optional, defaults work with the proxy
npm install
npm run dev
```

The Vite dev server runs on **http://localhost:5173** and proxies `/api` and `/admin` to the backend at `http://localhost:4000`. Make sure the backend is up first (`npm run dev` and `npm run worker:dev` from the project root).

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Path or absolute URL the axios client points at. Use `/api/v1` to leverage the dev proxy; use a full URL in production. |
| `VITE_API_PROXY_TARGET` | `http://localhost:4000` | Target the dev proxy forwards to |

## Project layout

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                # ReactDOM bootstrap, providers
    ├── App.jsx                 # Routes
    ├── styles/index.css        # Tailwind layers + utility classes (.btn, .card, .input...)
    ├── api/
    │   ├── axiosClient.js      # Shared axios with JWT + envelope unwrap + 401 handling
    │   ├── auth.api.js
    │   ├── jobs.api.js
    │   └── metrics.api.js
    ├── context/
    │   ├── AuthContext.jsx     # login / register / logout / persisted in localStorage
    │   └── ToastContext.jsx    # success / error / info toasts
    ├── hooks/
    │   ├── useAuth.js
    │   └── useToast.js
    ├── routes/
    │   ├── AppRoutes.jsx
    │   └── ProtectedRoute.jsx
    ├── layouts/
    │   └── AppLayout.jsx       # Navbar + Sidebar shell
    ├── components/
    │   ├── Navbar.jsx
    │   ├── Sidebar.jsx
    │   ├── MetricsCard.jsx
    │   ├── JobsTable.jsx
    │   ├── JobStatusBadge.jsx
    │   ├── FormInput.jsx
    │   ├── Loader.jsx
    │   ├── EmptyState.jsx
    │   └── Toast.jsx
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── RegisterPage.jsx
    │   ├── DashboardPage.jsx
    │   ├── JobsListPage.jsx
    │   ├── CreateJobPage.jsx
    │   ├── JobDetailsPage.jsx
    │   ├── RescheduleJobPage.jsx
    │   └── NotFoundPage.jsx
    └── utils/
        ├── cn.js
        └── formatDate.js
```

## How auth works

1. `POST /auth/login` returns `{ token, user }`. The token is stored in `localStorage` under `chronos.token`.
2. The axios client attaches `Authorization: Bearer <token>` to every request.
3. On any `401` the client clears the token and dispatches a `chronos:logout` event; the `AuthProvider` listens for it and resets the in-memory state. `ProtectedRoute` then redirects to `/login`.

## How the dashboard auto-refreshes

The dashboard polls `/metrics` and `/metrics/runs` every 10 seconds; the job details page polls `/jobs/:id` and `/jobs/:id/runs` every 8 seconds. Cheap, simple, no WebSocket required — perfect for a capstone demo.

## Build for production

```bash
npm run build
# Outputs to dist/. Deploy to Vercel/Netlify and point VITE_API_BASE_URL at your hosted backend.
```
