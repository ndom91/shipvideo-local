import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const renderer = new URL("./render.mjs", import.meta.url);

function checkScene(scenePath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      renderer.pathname,
      "--check",
      scenePath,
      "20",
    ]);
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolve({ code, stderr, stdout });
    });
  });
}

test("renderer rejects nondeterministic and embedded media scenes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shipvideo-render-"));
  const scenarios = [
    ["video", '<video src="movie.mp4"></video>'],
    ["script", "<script>console.log('hello')</script>"],
    ["transition", "<style>body { transition: opacity 1s; }</style>"],
    ["randomness", '<div onload="Math.random()"></div>'],
  ];

  try {
    for (const [name, body] of scenarios) {
      const scenePath = join(directory, `${name}.html`);
      await writeFile(
        scenePath,
        `<html><body>${body}${"x".repeat(250)}</body></html>`,
      );
      const result = await checkScene(scenePath);
      assert.notEqual(result.code, 0, name);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("renderer checks the exact scene endpoint", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shipvideo-render-"));
  const scenePath = join(directory, "scene.html");

  try {
    await writeFile(scenePath, `<html><body>${"x".repeat(250)}</body></html>`);
    const result = await checkScene(scenePath);
    assert.equal(result.code, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.frames.at(-1)?.t, 20);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
