import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const localJobs = new URL("../web/src/lib/local-jobs.ts", import.meta.url);

function listJobs(webRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--experimental-strip-types",
        "--input-type=module",
        "--eval",
        `import { listLocalJobs } from ${JSON.stringify(localJobs.href)}; console.log(JSON.stringify(await listLocalJobs()));`,
      ],
      { cwd: webRoot },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(JSON.parse(output));
      else reject(new Error(`listLocalJobs exited ${code}`));
    });
  });
}

async function writeJob(webRoot, jobId, status, modifiedAt) {
  const directory = join(webRoot, ".local-jobs", jobId);
  const statePath = join(directory, "state.json");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "job.json"),
    JSON.stringify({ mode: "prompt", input: jobId }),
  );
  await writeFile(
    statePath,
    JSON.stringify({
      status,
      phase: status,
      updatedAt: modifiedAt.toISOString(),
    }),
  );
  await utimes(statePath, modifiedAt, modifiedAt);
}

test("retention removes stale completed jobs but keeps active jobs", async () => {
  const root = await mkdtemp(join(tmpdir(), "shipvideo-jobs-"));
  const webRoot = join(root, "web");
  const stale = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

  try {
    await writeJob(webRoot, "old-done", "done", stale);
    await writeJob(webRoot, "old-working", "working", stale);
    await writeJob(webRoot, "new-done", "done", new Date());

    const jobs = await listJobs(webRoot);

    assert.deepEqual(jobs.map((job) => job.jobId).sort(), [
      "new-done",
      "old-working",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
