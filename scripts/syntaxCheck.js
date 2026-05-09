/* eslint-disable no-console */
// Syntax-only check: spawns `node --check FILE` for every .js file under src/
// and prisma/. Does NOT execute any module — safe to run without Postgres
// or Redis available.

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && full.endsWith(".js")) yield full;
  }
}

const roots = ["src", "prisma", "scripts"]
  .map((d) => path.resolve(process.cwd(), d))
  .filter((d) => fs.existsSync(d));

let failed = 0;
let count = 0;

for (const root of roots) {
  for (const file of walk(root)) {
    count++;
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    const rel = path.relative(process.cwd(), file);
    if (result.status === 0) {
      console.log("ok    ", rel);
    } else {
      failed++;
      console.error("FAIL  ", rel);
      if (result.stderr) console.error(result.stderr.trim());
    }
  }
}

console.log(`\nChecked ${count} file(s); ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
