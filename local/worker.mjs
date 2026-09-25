import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const jobDir = process.argv[2];
if (!jobDir) throw new Error("Job directory is required.");
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const job = JSON.parse(await readFile(join(jobDir, "job.json"), "utf8"));
const statePath = join(jobDir, "state.json");

async function update(state) {
  await writeFile(
    statePath,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2),
  );
}

function waitFor(child) {
  return new Promise((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("close", (code) => resolveExit(code ?? 1));
  });
}

const scenePath = join(jobDir, "scene.html");
const sceneConfigPath = join(jobDir, "scene.json");
const videoPath = join(jobDir, "video.mp4");
const rendererPath = join(repoRoot, "local", "render.mjs");
const log = createWriteStream(join(jobDir, "claude.log"), { flags: "a" });
const source =
  job.mode === "url"
    ? `Research this public URL: ${job.input}`
    : `Use this launch-video brief: ${job.input}`;
const prompt = `You are the local launch-video director. ${source}

Work only in your current directory. Produce a 20-40 second launch film as a single 1920x1080 HTML document at ${scenePath}. Write ${sceneConfigPath} containing exactly JSON with one durationSeconds number between 20 and 40. You may use WebFetch or curl to understand a URL.

The film must be deterministic: no video, audio, iframe, external images, external scripts, CSS transitions, or Math.random. Google Font stylesheets are allowed. Use CSS keyframes or requestAnimationFrame. Tell a concise product story in 6-10 beats with large kinetic typography and custom HTML/SVG/canvas visuals.

Before finishing, run this command at least once and fix every error it reports:
node ${rendererPath} --check ${scenePath} <durationSeconds>

Do not render the MP4 yourself; the local worker will render it after you finish. Do not edit files outside this job directory.`;

try {
  await update({ status: "working", phase: "Claude is writing the film" });
  const claude = process.env.CLAUDE_COMMAND ?? "claude";
  const agent = spawn(
    claude,
    [
      "-p",
      prompt,
      "--model",
      process.env.CLAUDE_MODEL ?? "opus",
      "--permission-mode",
      "dontAsk",
      "--allowedTools",
      "Read,Write,Edit,WebFetch,Bash(node *)",
      "--output-format",
      "json",
    ],
    {
      cwd: jobDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  agent.stdout.pipe(log, { end: false });
  agent.stderr.pipe(log, { end: false });
  const code = await waitFor(agent);
  if (code !== 0)
    throw new Error(`Claude Code exited with status ${code}. See claude.log.`);
  await access(scenePath);
  const sceneConfig = JSON.parse(await readFile(sceneConfigPath, "utf8"));
  const duration = Number(sceneConfig.durationSeconds);
  if (!Number.isFinite(duration) || duration < 20 || duration > 40)
    throw new Error(
      "scene.json must contain durationSeconds between 20 and 40.",
    );
  await update({ status: "working", phase: "Checking the scene" });
  const check = spawn(
    process.execPath,
    [rendererPath, "--check", scenePath, String(duration)],
    { cwd: jobDir, stdio: ["ignore", "pipe", "pipe"] },
  );
  check.stdout.pipe(log, { end: false });
  check.stderr.pipe(log, { end: false });
  const checkCode = await waitFor(check);
  if (checkCode !== 0)
    throw new Error(
      `The scene failed validation. See claude.log for the details.`,
    );
  await update({ status: "working", phase: "Rendering frames locally" });
  const render = spawn(
    process.execPath,
    [rendererPath, "--render", scenePath, String(duration), videoPath],
    { cwd: jobDir, stdio: ["ignore", "pipe", "pipe"] },
  );
  render.stdout.pipe(log, { end: false });
  render.stderr.pipe(log, { end: false });
  const renderCode = await waitFor(render);
  if (renderCode !== 0)
    throw new Error(
      `The local renderer exited with status ${renderCode}. See claude.log.`,
    );
  const info = await stat(videoPath);
  await update({
    status: "done",
    phase: "Done",
    bytes: info.size,
    videoPath,
    note: "Generated with your local Claude Code subscription and rendered on this Mac.",
  });
} catch (error) {
  await update({
    status: "error",
    phase: "Failed",
    message: error instanceof Error ? error.message : String(error),
  });
} finally {
  log.end();
}
