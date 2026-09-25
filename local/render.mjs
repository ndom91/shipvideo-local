import { spawn } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const ffmpegPath = require("ffmpeg-static");

const WIDTH = 1920;
const HEIGHT = 1080;
const ALLOWED_REMOTE_ORIGINS = new Set([
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
]);
const CLOCK = `(() => {
  let now = 0, rafs = new Map(), rafId = 0, timers = new Map(), timerId = 0;
  const epoch = Date.now(), RealDate = Date, seen = new WeakMap();
  performance.now = () => now;
  const FakeDate = function (...args) { return args.length ? new RealDate(...args) : new RealDate(epoch + now); };
  FakeDate.now = () => epoch + now; FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse; FakeDate.prototype = RealDate.prototype;
  window.Date = FakeDate;
  window.requestAnimationFrame = (cb) => { rafs.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => rafs.delete(id);
  window.setTimeout = (cb, ms = 0, ...args) => { const id = ++timerId; timers.set(id, { at: now + Math.max(0, +ms || 0), cb, args, every: 0 }); return id; };
  window.setInterval = (cb, ms = 0, ...args) => { const id = ++timerId, every = Math.max(1, +ms || 1); timers.set(id, { at: now + every, cb, args, every }); return id; };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  window.__seek = (target) => {
    while (now < target - 1e-6) {
      now = Math.min(target, now + 1000 / 60);
      for (;;) {
        let next;
        for (const entry of timers) if (entry[1].at <= now + 1e-6 && (!next || entry[1].at < next[1].at)) next = entry;
        if (!next) break;
        const [id, timer] = next;
        if (timer.every) timer.at += timer.every; else timers.delete(id);
        try { typeof timer.cb === "function" ? timer.cb(...timer.args) : (0, eval)(String(timer.cb)); } catch (error) { console.error(String(error)); }
      }
      const callbacks = [...rafs.values()]; rafs = new Map();
      for (const callback of callbacks) { try { callback(now); } catch (error) { console.error(String(error)); } }
    }
    for (const animation of document.getAnimations({ subtree: true })) {
      try { let start = seen.get(animation); if (start === undefined) { start = now; seen.set(animation, start); } animation.pause(); animation.currentTime = Math.max(0, now - start); } catch {}
    }
  };
})();`;

function assertScene(html) {
  if (
    html.length < 200 ||
    (!/<html[\s>]/i.test(html) && !/<body[\s>]/i.test(html))
  )
    throw new Error("scene.html must be a complete HTML document.");
  if (/<(video|audio|iframe|script|img)[\s>]/i.test(html))
    throw new Error(
      "Scenes cannot use video, audio, iframe, script, or img elements.",
    );
  if (/\btransition(?:-[\w-]+)?\s*:/i.test(html))
    throw new Error("Scenes cannot use CSS transitions.");
  if (/\bMath\s*\.\s*random\s*\(/.test(html))
    throw new Error("Scenes cannot use Math.random().");
}

async function openScene(html) {
  const browser = await chromium.launch({
    args: [
      "--disable-gpu",
      "--font-render-hinting=none",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  await context.addInitScript(CLOCK);
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    const origin = new URL(route.request().url()).origin;
    return ALLOWED_REMOTE_ORIGINS.has(origin)
      ? route.continue()
      : route.abort();
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      errors.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on("requestfailed", (request) =>
    errors.push(`request failed: ${request.url()}`),
  );
  await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForLoadState("networkidle", { timeout: 10_000 })
    .catch(() => undefined);
  await page.evaluate(() => window.__seek(0));
  return { browser, context, page, errors };
}

async function check(html, durationSeconds) {
  const scene = await openScene(html);
  try {
    const frames = [];
    for (let second = 0; second <= durationSeconds; second += 3) {
      await scene.page.evaluate((ms) => window.__seek(ms), second * 1000);
      frames.push(
        await scene.page.evaluate(
          (t) => ({
            t,
            text: document.body.innerText
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 1000),
          }),
          second,
        ),
      );
    }
    if (frames.at(-1)?.t !== durationSeconds) {
      await scene.page.evaluate(
        (ms) => window.__seek(ms),
        durationSeconds * 1000,
      );
      frames.push(
        await scene.page.evaluate(
          (t) => ({
            t,
            text: document.body.innerText
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 1000),
          }),
          durationSeconds,
        ),
      );
    }
    return { ok: scene.errors.length === 0, errors: scene.errors, frames };
  } finally {
    await scene.context.close();
    await scene.browser.close();
  }
}

async function render(html, durationSeconds, output) {
  const scene = await openScene(html);
  const fps = 30;
  const total = Math.round(durationSeconds * fps);
  await mkdir(dirname(output), { recursive: true });
  if (scene.errors.length > 0)
    throw new Error(`Scene check failed:\n${scene.errors.join("\n")}`);
  const ffmpeg = spawn(ffmpegPath, [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "image2pipe",
    "-framerate",
    String(fps),
    "-i",
    "-",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output,
  ]);
  let stderr = "";
  ffmpeg.stderr.on("data", (data) => {
    stderr += String(data);
  });
  try {
    for (let frame = 0; frame < total; frame++) {
      await scene.page.evaluate(
        (ms) => window.__seek(ms),
        (frame * 1000) / fps,
      );
      const image = await scene.page.screenshot({ type: "jpeg", quality: 92 });
      if (!ffmpeg.stdin.write(image))
        await new Promise((resolveDrain) =>
          ffmpeg.stdin.once("drain", resolveDrain),
        );
      if (frame % 90 === 0) console.log(`rendering ${frame}/${total}`);
    }
    if (scene.errors.length > 0)
      throw new Error(`Scene render failed:\n${scene.errors.join("\n")}`);
  } finally {
    ffmpeg.stdin.end();
    await scene.context.close();
    await scene.browser.close();
  }
  const exitCode = await new Promise((resolveExit) =>
    ffmpeg.on("close", resolveExit),
  );
  if (exitCode !== 0)
    throw new Error(`ffmpeg exited ${exitCode}: ${stderr.slice(-1500)}`);
}

const [mode, scenePath, value, outputPath] = process.argv.slice(2);
if (!mode || !scenePath)
  throw new Error(
    "Usage: render.mjs --check scene.html duration | --render scene.html duration output.mp4",
  );
const html = await readFile(resolve(scenePath), "utf8");
assertScene(html);
const durationSeconds = Number(value);
if (
  !Number.isFinite(durationSeconds) ||
  durationSeconds < 3 ||
  durationSeconds > 90
)
  throw new Error("Duration must be between 3 and 90 seconds.");
if (mode === "--check") {
  const report = await check(html, durationSeconds);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} else if (mode === "--render" && outputPath) {
  await render(html, durationSeconds, resolve(outputPath));
  console.log(
    JSON.stringify({
      output: resolve(outputPath),
      bytes: (await stat(resolve(outputPath))).size,
    }),
  );
} else {
  throw new Error(
    "Usage: render.mjs --check scene.html duration | --render scene.html duration output.mp4",
  );
}
