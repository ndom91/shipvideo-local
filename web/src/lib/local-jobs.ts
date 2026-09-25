import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

export type Mode = "url" | "prompt";
export type LocalJobState = {
  status: "working" | "done" | "error";
  phase: string;
  updatedAt: string;
  bytes?: number;
  videoPath?: string;
  message?: string;
  note?: string;
};

const webRoot = process.cwd();
const jobRoot = join(webRoot, ".local-jobs");
const repoRoot = dirname(webRoot);
const worker = join(repoRoot, "local", "worker.mjs");

export function newJobId(): string {
  return randomBytes(6).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x").slice(0, 8);
}

export function jobDirectory(jobId: string): string {
  return join(jobRoot, jobId);
}

export async function createLocalJob(input: { jobId: string; mode: Mode; input: string }): Promise<void> {
  const dir = jobDirectory(input.jobId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "job.json"), JSON.stringify(input, null, 2));
  await writeFile(join(dir, "state.json"), JSON.stringify({ status: "working", phase: "Starting local Claude Code", updatedAt: new Date().toISOString() } satisfies LocalJobState, null, 2));
  const child = spawn(process.execPath, [worker, dir], { cwd: dir, detached: true, stdio: "ignore", env: process.env });
  child.unref();
}

export async function getLocalJob(jobId: string): Promise<LocalJobState | null> {
  const statePath = join(jobDirectory(jobId), "state.json");
  if (!existsSync(statePath)) return null;
  return JSON.parse(await readFile(statePath, "utf8")) as LocalJobState;
}

export function localVideoPath(jobId: string): string {
  return join(jobDirectory(jobId), "video.mp4");
}
