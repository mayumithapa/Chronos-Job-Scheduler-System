# Chronos - Distributed Job Scheduler System
## Final Capstone Project Blueprint

---

# 1. Project Overview

## Project Name
**Chronos - Distributed Job Scheduler System**

## Project Goal
Build a scalable backend system that allows users to:
- Create jobs
- Schedule jobs for future execution
- Create recurring jobs
- Monitor job execution
- Retry failed jobs automatically
- Cancel/reschedule jobs
- View execution history and logs

The project will expose REST APIs that can later connect to a frontend dashboard.

---

# 2. Main Objective

The system should behave like a mini version of:
- Cron systems
- Sidekiq
- Celery Beat
- BullMQ
- Quartz Scheduler

But simplified enough to build within a capstone timeline.

---

# 3. Final Architecture (Simple + Impressive)

We will build:

```text
                ┌──────────────────┐
                │     Client       │
                │ Postman / Frontend
                └────────┬─────────┘
                         │ REST APIs
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
                              │   Worker Server  │
                              │ Executes Jobs    │
                              └──────────────────┘
```

---

# 4. Tech Stack

## Backend
- Node.js
- Express.js

## Database
- PostgreSQL

## Queue System
- BullMQ

## Redis
- Redis server

## Authentication
- JWT Authentication

## ORM
Choose ONE:
- Prisma (recommended)
OR
- Sequelize

## Logging
- Winston / Pino

## API Documentation
- Swagger

## Monitoring
- Bull Board
OR
- Custom metrics API

---

# 5. Why This Stack?

## Why Node.js?
- Great for async systems
- Good for schedulers and queues

## Why PostgreSQL?
- Reliable relational database
- Easy querying
- Production-ready

## Why Redis + BullMQ?
This makes the project look industry-level.

BullMQ gives:
- delayed jobs
- retries
- recurring jobs
- job priorities
- worker handling

WITHOUT writing complex scheduler logic manually.

This keeps the project impressive but manageable.

---

# 6. High-Level System Flow

# COMPLETE FLOW

```text
USER CREATES JOB
        │
        ▼
API validates request
        │
        ▼
Store job in PostgreSQL
        │
        ▼
Push job into Redis Queue
        │
        ▼
Worker picks job
        │
        ▼
Execute task
        │
 ┌──────┴────────┐
 ▼               ▼
SUCCESS         FAILURE
 │               │
 ▼               ▼
Update DB     Retry Logic
 │               │
 ▼               ▼
Save Logs    Retry Count++
 │               │
 ▼               ▼
Return       If max retries reached
status       mark FAILED permanently
```

---

# 7. Core Features

# FEATURE 1 — User Authentication

## APIs
- Register
- Login

## Flow

```text
User Registers
    ↓
Password hashed
    ↓
Stored in DB
    ↓
Login
    ↓
JWT token generated
    ↓
Protected APIs accessible
```

## Tables
### users
| field | type |
|---|---|
| id | UUID |
| name | string |
| email | string |
| password | string |
| created_at | timestamp |

---

# FEATURE 2 — Create One-Time Jobs

## Example
```json
{
  "name": "Send Weekly Report",
  "type": "email",
  "payload": {
    "email": "test@gmail.com"
  },
  "scheduledAt": "2025-01-20T10:00:00Z"
}
```

## Flow
```text
Client creates job
    ↓
Validate payload
    ↓
Save in jobs table
    ↓
Push delayed job into BullMQ
    ↓
Worker executes at correct time
```

---

# FEATURE 3 — Recurring Jobs

## Example
```json
{
  "name": "Daily Cleanup",
  "cron": "0 0 * * *"
}
```

## Supported Recurrence
- Hourly
- Daily
- Weekly
- Monthly

---

# FEATURE 4 — Job Management

Users should be able to:
- View jobs
- View job status
- Cancel jobs
- Pause jobs
- Reschedule jobs

---

# FEATURE 5 — Failure Handling

## Retry Strategy

```text
Job fails
   ↓
Retry after delay
   ↓
Retry count increases
   ↓
If retries exceed limit
   ↓
Move to failed state
```

---

# FEATURE 6 — Logging System

Every execution should create logs.

---

# FEATURE 7 — Monitoring

## Create Metrics API

### GET /metrics

Returns:
```json
{
  "totalJobs": 120,
  "successfulJobs": 95,
  "failedJobs": 12,
  "queuedJobs": 8,
  "runningJobs": 5
}
```

---

# 8. Database Design

# users table

| Column | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| email | VARCHAR |
| password | VARCHAR |
| created_at | TIMESTAMP |

---

# jobs table

| Column | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| name | VARCHAR |
| type | VARCHAR |
| payload | JSON |
| status | VARCHAR |
| scheduled_at | TIMESTAMP |
| cron_expression | VARCHAR |
| retry_count | INT |
| max_retries | INT |
| priority | VARCHAR |
| created_at | TIMESTAMP |

---

# job_runs table

| Column | Type |
|---|---|
| id | UUID |
| job_id | UUID |
| status | VARCHAR |
| started_at | TIMESTAMP |
| completed_at | TIMESTAMP |
| error_message | TEXT |
| execution_time | INT |
| attempt_number | INT |

---

# 9. Folder Structure

```text
chronos/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── workers/
│   ├── queues/
│   ├── prisma/
│   ├── models/
│   ├── utils/
│   ├── logs/
│   └── app.js
│
├── docs/
├── tests/
├── .env
├── package.json
└── README.md
```

---

# 10. Complete Development Roadmap

## PHASE 1
- setup node project
- setup express
- setup postgres
- setup prisma
- setup redis

## PHASE 2
- register
- login
- jwt middleware

## PHASE 3
- create job
- list jobs
- update jobs
- cancel jobs

## PHASE 4
- setup BullMQ
- delayed jobs
- recurring jobs

## PHASE 5
- process jobs
- retries
- logging

## PHASE 6
- metrics API
- health check
- queue stats

## PHASE 7
- swagger
- README
- architecture diagram

## PHASE 8
- deployment

---

# 11. Final Notes

DO NOT overcomplicate:
- avoid microservices
- avoid Kubernetes
- avoid Kafka initially

Focus on:
- reliability
- retries
- scheduling
- monitoring
- clean code

That is enough to make this an excellent capstone project.
