import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LocalJobState, LocalJobSummary, Mode } from "./job-types";

export type { LocalJobState, LocalJobSummary, Mode } from "./job-types";

const webRoot = process.cwd();
const jobRoot = join(webRoot, ".local-jobs");
const repoRoot = dirname(webRoot);
const worker = join(repoRoot, "local", "worker.mjs");
const maxJobAgeMs = 30 * 24 * 60 * 60 * 1000;
const maxRetainedJobs = 50;

export function newJobId(): string {
  return randomBytes(6)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "x")
    .slice(0, 8);
}

export function jobDirectory(jobId: string): string {
  return join(jobRoot, jobId);
}

async function pruneLocalJobs(): Promise<void> {
  if (!existsSync(jobRoot)) return;
  const entries = await readdir(jobRoot, { withFileTypes: true });
  const jobs = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const directory = join(jobRoot, entry.name);
          try {
            return {
              directory,
              updatedAt: (await stat(join(directory, "state.json"))).mtimeMs,
            };
          } catch {
            return null;
          }
        }),
    )
  )
    .filter(
      (job): job is { directory: string; updatedAt: number } => job !== null,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const cutoff = Date.now() - maxJobAgeMs;
  await Promise.all(
    jobs
      .filter(
        (job, index) => job.updatedAt < cutoff || index >= maxRetainedJobs,
      )
      .map((job) => rm(job.directory, { recursive: true, force: true })),
  );
}

export async function createLocalJob(input: {
  jobId: string;
  mode: Mode;
  input: string;
}): Promise<void> {
  await pruneLocalJobs();
  const dir = jobDirectory(input.jobId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "job.json"), JSON.stringify(input, null, 2));
  await writeFile(
    join(dir, "state.json"),
    JSON.stringify(
      {
        status: "working",
        phase: "Starting local Claude Code",
        updatedAt: new Date().toISOString(),
      } satisfies LocalJobState,
      null,
      2,
    ),
  );
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [worker, dir], {
      cwd: dir,
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function getLocalJob(
  jobId: string,
): Promise<LocalJobState | null> {
  const statePath = join(jobDirectory(jobId), "state.json");
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(await readFile(statePath, "utf8")) as LocalJobState;
  } catch {
    return null;
  }
}

export async function listLocalJobs(): Promise<LocalJobSummary[]> {
  await pruneLocalJobs();
  if (!existsSync(jobRoot)) return [];
  const entries = await readdir(jobRoot, { withFileTypes: true });
  const jobs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          const [job, state] = await Promise.all([
            readFile(join(jobRoot, entry.name, "job.json"), "utf8"),
            readFile(join(jobRoot, entry.name, "state.json"), "utf8"),
          ]);
          const input = JSON.parse(job) as { mode?: unknown; input?: unknown };
          return {
            ...(JSON.parse(state) as LocalJobState),
            jobId: entry.name,
            mode: input.mode === "url" ? "url" : "prompt",
            input:
              typeof input.input === "string" ? input.input : "Untitled render",
          } satisfies LocalJobSummary;
        } catch {
          return null;
        }
      }),
  );
  return jobs
    .filter((job): job is LocalJobSummary => job !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function localVideoPath(jobId: string): string {
  return join(jobDirectory(jobId), "video.mp4");
}
