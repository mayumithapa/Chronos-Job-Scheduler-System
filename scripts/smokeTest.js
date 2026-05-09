/* eslint-disable no-console */
// Scripted smoke test for Chronos:
//   1. /health/ready
//   2. register + login + /auth/me
//   3. create an immediate LOG job
//   4. poll /jobs/:id until status === SUCCESS (worker must be running)
//   5. verify the JobRun record was written
//   6. confirm the run is reflected in /metrics
//
// Assumes the API is running at API_URL (default http://localhost:4000).

require("dotenv").config();

const API_URL = process.env.API_URL || "http://localhost:4000";
const BASE = `${API_URL}/api/v1`;
const PASSWORD = "smoketest1234";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function http(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(
      `${method} ${path} -> ${res.status}: ${
        typeof data === "object" ? JSON.stringify(data) : data
      }`
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function step(label) {
  console.log(`\n>>> ${label}`);
}
function pass(label, detail) {
  console.log(`  PASS  ${label}${detail ? "  " + JSON.stringify(detail) : ""}`);
}

async function waitForStatus(token, jobId, expected, timeoutMs = 45000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeoutMs) {
    last = await http("GET", `/jobs/${jobId}`, { token });
    const status = last?.data?.status;
    if (status === expected) return last.data;
    if (status === "FAILED" || status === "CANCELLED") {
      throw new Error(
        `Job ended in unexpected status ${status}: ${last.data.lastError || ""}`
      );
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Timed out (${timeoutMs}ms) waiting for ${jobId} -> ${expected}; last=${last?.data?.status}`
  );
}

(async () => {
  try {
    step(`Smoke target: ${BASE}`);

    step("Health check");
    const health = await http("GET", "/health/ready");
    if (health.data.status !== "ok") throw new Error("health not ok");
    pass("/health/ready", health.data.checks);

    step("Register + me + login");
    const email = `smoke+${suffix()}@example.com`;
    const reg = await http("POST", "/auth/register", {
      body: { name: "Smoke Test", email, password: PASSWORD },
    });
    const token = reg.data?.token;
    if (!token) throw new Error("no token from /auth/register");
    pass("registered", { email, userId: reg.data.user.id });

    const me = await http("GET", "/auth/me", { token });
    if (me.data.user.email !== email) throw new Error("/me email mismatch");
    pass("/auth/me", { email: me.data.user.email });

    const login = await http("POST", "/auth/login", {
      body: { email, password: PASSWORD },
    });
    if (!login.data?.token) throw new Error("/auth/login returned no token");
    pass("/auth/login");

    step("Create immediate LOG job");
    const created = await http("POST", "/jobs", {
      token,
      body: {
        name: "Smoke LOG job",
        type: "LOG",
        priority: "HIGH",
        payload: { message: `hello from smoke ${suffix()}` },
      },
    });
    const job = created.data;
    if (!job?.id) throw new Error("create returned no job id");
    pass("POST /jobs", { id: job.id, status: job.status });

    step("Wait for worker to mark job SUCCESS");
    const finished = await waitForStatus(token, job.id, "SUCCESS", 45000);
    pass("job reached SUCCESS", {
      status: finished.status,
      runs: finished.runs.length,
    });

    step("Verify run record");
    const runsResp = await http("GET", `/jobs/${job.id}/runs`, { token });
    const runs = runsResp.data.items;
    if (!runs.length) throw new Error("no runs recorded");
    const run = runs[0];
    if (run.status !== "SUCCESS")
      throw new Error(`run status=${run.status} (expected SUCCESS)`);
    if (run.executionTime == null) throw new Error("missing executionTime");
    pass("run", {
      status: run.status,
      executionTimeMs: run.executionTime,
      output: run.output,
    });

    step("Metrics roundtrip");
    const metrics = await http("GET", "/metrics", { token });
    const m = metrics.data;
    if (m.totalJobs < 1) throw new Error("metrics.totalJobs is 0");
    if (m.runs.successful < 1)
      throw new Error("metrics.runs.successful is 0");
    pass("metrics", {
      totalJobs: m.totalJobs,
      successfulJobs: m.successfulJobs,
      runs: m.runs,
      queue: m.queue,
    });

    console.log("\nALL SMOKE CHECKS PASSED");
    process.exit(0);
  } catch (err) {
    console.error("\nSMOKE TEST FAILED:", err.message);
    if (err.body) console.error("  body:", JSON.stringify(err.body, null, 2));
    process.exit(1);
  }
})();
