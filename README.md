# Chronos — Distributed Job Scheduler

A production-style backend that lets users **create, schedule, monitor and retry jobs** — like a mini Sidekiq / Celery Beat / BullMQ-as-a-service. Built with Node.js, Express, PostgreSQL, Redis and BullMQ following the [Capstone Blueprint](./Chronos_Capstone_Blueprint.md).

## Features

- JWT authentication (register / login / `me`)
- One-time scheduled jobs (`scheduledAt`)
- Recurring jobs (cron expressions: hourly, daily, weekly, monthly, …)
- Pause / Resume / Cancel / Reschedule / Update
- Pluggable job handlers: `EMAIL`, `WEBHOOK`, `LOG`, `CUSTOM`
- Automatic retries with exponential backoff and a configurable `maxRetries`
- Per-run history (`job_runs`) with execution time and error message
- `/metrics` API with aggregated counts + live BullMQ queue stats
- `/health` and `/health/ready` probes for DB and Redis
- Bull Board admin UI at `/admin/queues`
- Full Swagger/OpenAPI docs at `/api/v1/docs`
- Centralized Winston logger writing to `logs/error.log` and `logs/combined.log`
- Helmet, CORS, compression, per-IP rate limiter
- Graceful shutdown for both API and worker processes

## Architecture

```
                 ┌──────────────────┐
                 │     Client       │
                 │ Postman / UI     │
                 └────────┬─────────┘
                          │ REST
                          ▼
                ┌───────────────────┐
                │   API SERVER      │
                │  Express / Node   │
                └────────┬──────────┘
                         │
         ┌───────────────┼────────────────┐
         ▼                                ▼
 ┌──────────────────┐          ┌──────────────────┐
 │   PostgreSQL     │          │      Redis       │
 │ Jobs + Logs DB   │          │ Queue + Cache    │
 └──────────────────┘          └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │   Worker process │
                                │  Executes Jobs   │
                                └──────────────────┘
```

The API server **only schedules** jobs (writes to PostgreSQL + pushes to BullMQ).
The worker process **only executes** jobs (pulls from BullMQ, calls handlers, writes runs back to PostgreSQL). They scale independently.

## Tech Stack

| Concern              | Choice                            |
| -------------------- | --------------------------------- |
| Runtime              | Node.js 18+                       |
| HTTP framework       | Express 4                         |
| Database             | PostgreSQL 16                     |
| ORM                  | Prisma 5                          |
| Queue                | BullMQ 5 + Redis 7                |
| Auth                 | JSON Web Tokens (`jsonwebtoken`)  |
| Hashing              | bcryptjs                          |
| Validation           | Zod                               |
| Logging              | Winston                           |
| API docs             | swagger-jsdoc + swagger-ui-express |
| Queue UI             | Bull Board                        |
| Email                | Nodemailer (optional, mocked when unset) |

## Project layout

```
chronos/
├── Dockerfile                  # Backend image (used by api + worker services)
├── docker-compose.yml          # Full stack: postgres + redis + api + worker + frontend
├── .dockerignore
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── app.js                  # Express app factory
│   ├── server.js               # API entry point
│   ├── config/                 # env, logger, db, redis, swagger, bull-board
│   ├── controllers/            # thin HTTP handlers
│   ├── routes/                 # Express routers + Swagger annotations
│   ├── middleware/             # auth, validate, errorHandler, requestLogger
│   ├── services/               # business logic (auth, jobs, metrics)
│   ├── queues/                 # BullMQ queue + queue events
│   ├── workers/
│   │   ├── index.js            # Worker entry point
│   │   ├── jobWorker.js        # Worker pipeline (retry/backoff, run logging)
│   │   └── handlers/           # email, webhook, log, custom
│   ├── validators/             # Zod schemas
│   └── utils/                  # ApiError, ApiResponse, asyncHandler, priority
├── frontend/                   # React + Vite dashboard
│   ├── Dockerfile              # Static build served by nginx with /api proxy
│   ├── nginx.conf
│   └── src/                    # pages, components, hooks, api client
└── logs/                       # auto-created at runtime (mounted as a volume in Docker)
```

## Quick start — Docker (recommended)

The fastest way to run the entire stack — Postgres, Redis, API, worker, and frontend — is with Docker. This requires only **Docker Desktop** (or Docker Engine + Compose plugin) on your machine.

```bash
git clone https://github.com/mayumithapa/Chronos-Job-Scheduler-System.git
cd Chronos-Job-Scheduler-System
docker compose up -d --build
```

That's it. After ~30 seconds (first build is slower; subsequent runs are nearly instant) everything is reachable at:

| URL | What it is |
| --- | --- |
| http://localhost:5173 | React dashboard (frontend) |
| http://localhost:5173/api/v1/docs | Swagger / OpenAPI docs (proxied) |
| http://localhost:5173/admin/queues | Bull Board admin UI (proxied) |
| http://localhost:4000/api/v1 | API server (direct) |
| http://localhost:4000/api/v1/health/ready | Liveness probe (DB + Redis) |

**Demo login** (auto-seeded into Postgres on first boot):

- email: `demo@chronos.local`
- password: `demo12345`

### What `docker compose up` actually does

Five containers come up with proper dependency ordering and healthchecks:

1. `postgres` (Postgres 16) — persisted to a named volume
2. `redis` (Redis 7) — persisted to a named volume
3. `api` — runs `prisma migrate deploy`, seeds the demo user, then starts the Express API on port 4000
4. `worker` — runs the BullMQ worker (`node src/workers/index.js`); waits for the API container to be healthy so migrations are applied first
5. `frontend` — nginx serving the production Vite build, reverse-proxying `/api/*` and `/admin/*` to the `api` container

Default service environment is wired in `docker-compose.yml` — all services share the same connection strings via a YAML anchor, so there's nothing to copy/paste. To override `JWT_SECRET` (recommended for anything other than a local demo), put it in a `.env` file next to `docker-compose.yml`:

```env
JWT_SECRET=replace-this-with-a-long-random-string
```

### Useful commands

```bash
docker compose logs -f api worker          # tail backend logs
docker compose logs -f frontend            # tail nginx access logs
docker compose ps                          # see container health
docker compose restart worker              # bounce just the worker
docker compose down                        # stop everything (volumes preserved)
docker compose down -v                     # stop + wipe DB and Redis (full reset)
docker compose up -d --scale worker=3      # run 3 worker replicas (BullMQ load-balances jobs across them)
```

### Demoing retries

Once everything is up, log in at http://localhost:5173 and create a job with:

- **Type:** CUSTOM
- **Payload:** `{ "fail": true, "failMessage": "boom" }`
- **Max retries:** 3
- **Scheduled time:** leave blank (runs immediately)

Watch the Execution History on the job's detail page — attempts will pile up with exponential backoff (5s → 10s → 20s) and finally mark the job FAILED. The retry events are also visible in `docker compose logs -f worker` and on Bull Board.

---

## Quick start — Native (without Docker)

> Requires Node.js 18+. Use this path if you don't want to install Docker, or if you'd rather run the API/worker with `nodemon` for hot reload while developing.

### 1. Install dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Start Postgres + Redis

```bash
docker compose up -d postgres redis
```

…or install Postgres + Redis natively, or point `DATABASE_URL` / `REDIS_URL` in `.env` at managed services like [Neon](https://neon.tech) and [Upstash](https://upstash.com).

### 3. Configure environment

```bash
cp .env.example .env
# then edit JWT_SECRET to something long and random
cp frontend/.env.example frontend/.env
```

### 4. Run the database migration

```bash
npm run prisma:migrate -- --name init
npm run db:seed   # optional — creates demo@chronos.local / demo12345
```

### 5. Start the API, the worker, and the frontend (three terminals)

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run worker:dev

# Terminal 3
cd frontend && npm run dev
```

The API will print:

```
Chronos API listening on http://localhost:4000
Docs: http://localhost:4000/api/v1/docs
Bull Board: http://localhost:4000/admin/queues
```

The frontend will print `Local: http://localhost:5173/`.

## API tour

Base URL: `http://localhost:4000/api/v1`

### Auth

```http
POST /auth/register
{ "name": "Ada", "email": "ada@example.com", "password": "supersecret123" }

POST /auth/login
{ "email": "ada@example.com", "password": "supersecret123" }
# -> { token: "<JWT>", user: {...} }

GET /auth/me            Authorization: Bearer <token>
```

### Create a one-time job

```http
POST /jobs              Authorization: Bearer <token>
{
  "name": "Send Weekly Report",
  "type": "EMAIL",
  "payload": { "to": "test@example.com", "subject": "Report" },
  "scheduledAt": "2026-05-09T03:30:00Z",
  "priority": "HIGH",
  "maxRetries": 5
}
```

### Create a recurring job

```http
POST /jobs
{
  "name": "Daily Cleanup",
  "type": "LOG",
  "payload": { "message": "running cleanup" },
  "cron": "0 0 * * *"
}
```

Cron format: standard 5-field (`minute hour day month weekday`). Examples:

| Recurrence | Cron           |
| ---------- | -------------- |
| Every hour | `0 * * * *`    |
| Every day at 09:00 | `0 9 * * *` |
| Every Monday 09:00 | `0 9 * * 1` |
| 1st of every month at 00:00 | `0 0 1 * *` |

### Manage jobs

```http
GET    /jobs?status=QUEUED&page=1&pageSize=20
GET    /jobs/:id           # job + last 25 runs
GET    /jobs/:id/runs      # paginated run history
PATCH  /jobs/:id           # update name/payload/priority/maxRetries/schedule
POST   /jobs/:id/cancel
POST   /jobs/:id/pause
POST   /jobs/:id/resume
POST   /jobs/:id/reschedule { "scheduledAt": "..." } | { "cron": "..." }
```

### Metrics & health

```http
GET /metrics          # totals, success rate, live queue stats
GET /metrics/runs     # most recent runs (across all jobs)
GET /health           # liveness
GET /health/ready     # checks DB + Redis
```

### Demo a failing job + retries

The `CUSTOM` handler supports forced failures — perfect for showing retries:

```http
POST /jobs
{
  "name": "Flaky job",
  "type": "CUSTOM",
  "payload": { "fail": true, "failMessage": "boom" },
  "maxRetries": 3
}
```

Watch `logs/combined.log` or Bull Board to see the exponential backoff retries.

## Data model

### `users`

| column     | type       |
| ---------- | ---------- |
| id         | UUID PK    |
| name       | VARCHAR    |
| email      | VARCHAR UQ |
| password   | VARCHAR    |
| created_at | TIMESTAMP  |
| updated_at | TIMESTAMP  |

### `jobs`

| column           | type                                 |
| ---------------- | ------------------------------------ |
| id               | UUID PK                              |
| user_id          | UUID FK → users                      |
| name             | VARCHAR                              |
| type             | enum (EMAIL, WEBHOOK, LOG, CUSTOM)   |
| payload          | JSON                                 |
| status           | enum (PENDING, QUEUED, RUNNING, SUCCESS, FAILED, CANCELLED, PAUSED) |
| scheduled_at     | TIMESTAMP nullable                   |
| cron_expression  | VARCHAR nullable                     |
| retry_count      | INT                                  |
| max_retries      | INT                                  |
| priority         | enum (LOW, NORMAL, HIGH, CRITICAL)   |
| queue_job_id     | VARCHAR — last BullMQ job id         |
| repeat_job_key   | VARCHAR — BullMQ repeatable key      |
| last_error       | TEXT                                 |
| created_at       | TIMESTAMP                            |
| updated_at       | TIMESTAMP                            |

### `job_runs`

| column          | type                              |
| --------------- | --------------------------------- |
| id              | UUID PK                           |
| job_id          | UUID FK → jobs                    |
| status          | enum (RUNNING, SUCCESS, FAILED)   |
| started_at      | TIMESTAMP                         |
| completed_at    | TIMESTAMP nullable                |
| error_message   | TEXT nullable                     |
| execution_time  | INT (ms)                          |
| attempt_number  | INT                               |
| output          | JSON nullable                     |

## Retry strategy

```
Job execution fails
   ↓
retry_count < max_retries ?
   ↓  yes
schedule one-shot retry with exponential backoff
backoff = base * 2^(attempt-1), capped at 5 minutes
   ↓  no
mark FAILED (one-time) or QUEUED (recurring; next cron tick)
```

Recurring jobs do **not** disappear when a single tick fails; the cron schedule keeps producing fresh runs while in-flight retries handle transient failures.

## Configuration reference

See [`.env.example`](./.env.example) for all variables. Highlights:

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | 4000 | API port |
| `API_BASE_PATH` | `/api/v1` | URL prefix |
| `WORKER_CONCURRENCY` | 5 | Parallel jobs per worker process |
| `DEFAULT_MAX_RETRIES` | 3 | Used when a job omits `maxRetries` |
| `DEFAULT_RETRY_BACKOFF_MS` | 5000 | Base for exponential backoff |
| `BULL_BOARD_ENABLED` | true | Toggle the admin UI |
| `SMTP_HOST` | _(empty)_ | Leave empty to mock email sending |

## NPM scripts

| Script               | Description |
| -------------------- | ----------- |
| `npm run dev`        | Start API with nodemon |
| `npm run worker:dev` | Start worker with nodemon |
| `npm start`          | Start API |
| `npm run worker`     | Start worker |
| `npm run prisma:migrate` | Run dev migration |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run db:seed`    | Insert the demo user |

## Deployment notes

- Run **at least two processes** in production: `node src/server.js` (API) and `node src/workers/index.js` (worker). Scale them independently.
- Use `npm run prisma:deploy` (not `migrate dev`) in production.
- Set a strong `JWT_SECRET` and TLS-terminate in front of the API.
- Increase `WORKER_CONCURRENCY` to throughput-tune. Add additional worker containers for horizontal scale-out — BullMQ takes care of distributing jobs.

## License

MIT
