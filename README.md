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
├── docker-compose.yml          # Postgres + Redis for local dev
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
└── logs/                       # auto-created at runtime
```

## Quick start

> Requires Node.js 18+. Recommended: Docker for Postgres + Redis.

### 1. Clone and install

```bash
npm install
```

### 2. Start Postgres + Redis

```bash
docker compose up -d
```

…or install Postgres + Redis natively and update `DATABASE_URL` / `REDIS_*` in `.env`.

### 3. Configure environment

```bash
cp .env.example .env
# then edit JWT_SECRET to something long & random
```

### 4. Run the database migration

```bash
npm run prisma:migrate -- --name init
npm run db:seed   # optional — creates demo@chronos.local / demo12345
```

### 5. Start the API and the worker (two terminals)

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run worker:dev
```

The API will print:

```
Chronos API listening on http://localhost:4000
Docs: http://localhost:4000/api/v1/docs
Bull Board: http://localhost:4000/admin/queues
```

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
