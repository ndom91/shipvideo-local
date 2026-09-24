import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { del, head, put } from "@vercel/blob";
import { randomBytes } from "node:crypto";

export type Mode = "url" | "prompt";

export function newJobId(): string {
  return randomBytes(6).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x").slice(0, 8);
}

export function pathnameFor(jobId: string): string {
  return `videos/${jobId}.mp4`;
}

export async function uploadTokenFor(jobId: string): Promise<string> {
  return generateClientTokenFromReadWriteToken({
    pathname: pathnameFor(jobId),
    allowedContentTypes: ["video/mp4"],
    addRandomSuffix: false,
    allowOverwrite: true,
    maximumSizeInBytes: 200 * 1024 * 1024,
    validUntil: Date.now() + 3 * 60 * 60 * 1000,
  });
}

export async function findVideo(jobId: string): Promise<{ url: string; size: number } | null> {
  try {
    const info = await head(pathnameFor(jobId));
    return { url: info.url, size: info.size };
  } catch {
    return null;
  }
}

// The agent must not copy a 400-character token by hand (models mangle those),
// so the upload token lives in a small public manifest keyed by the job id and
// the render tool fetches it itself. The token only allows one PUT to one path.
export function manifestPathname(jobId: string): string {
  return `jobs/${jobId}.json`;
}

export async function writeManifest(jobId: string): Promise<string> {
  const uploadToken = await uploadTokenFor(jobId);
  const result = await put(manifestPathname(jobId), JSON.stringify({ jobId, pathname: pathnameFor(jobId), uploadToken, createdAt: new Date().toISOString() }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return result.url;
}

export async function deleteManifest(jobId: string): Promise<void> {
  await del(manifestPathname(jobId)).catch(() => undefined);
}

export function jobText(input: { jobId: string; mode: Mode; input: string; manifestUrl: string }): string {
  return [
    "JOB",
    `job_id: ${input.jobId}`,
    `mode: ${input.mode}`,
    `input: ${input.input.replace(/\s*\n\s*/g, " ").trim()}`,
    `job_manifest: ${input.manifestUrl}`,
  ].join("\n");
}
