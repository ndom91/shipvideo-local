import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const worker = new URL("./worker.mjs", import.meta.url);

function runWorker(jobDirectory, claudeCommand) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [worker.pathname, jobDirectory], {
      env: { ...process.env, CLAUDE_COMMAND: claudeCommand },
    });
    child.once("error", reject);
    child.once("close", resolve);
  });
}

test("worker records an error when Claude writes an invalid scene duration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shipvideo-worker-"));
  const claude = join(directory, "fake-claude.mjs");

  try {
    await writeFile(
      join(directory, "job.json"),
      JSON.stringify({ mode: "prompt", input: "Test render" }),
    );
    await writeFile(
      claude,
      `#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
await writeFile("scene.html", "<html><body>${"x".repeat(250)}</body></html>");
await writeFile("scene.json", JSON.stringify({ durationSeconds: 91 }));
`,
    );
    await chmod(claude, 0o755);

    await runWorker(directory, claude);

    const state = JSON.parse(
      await readFile(join(directory, "state.json"), "utf8"),
    );
    assert.equal(state.status, "error");
    assert.match(state.message, /durationSeconds between 20 and 40/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
