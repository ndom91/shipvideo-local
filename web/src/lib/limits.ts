import { head, put } from "@vercel/blob";

// Two cheap guards so a public form cannot run up the OpenComputer bill:
// a per-IP limiter (per function instance; Fluid compute keeps instances warm
// so it is meaningfully sticky) and a global daily cap kept as a tiny counter
// in the Blob store (racy by design; it is a soft ceiling, not accounting).
// The Vercel Firewall rate-limit rule on POST /api/jobs is the hard layer.

const PER_IP_PER_HOUR = Number(process.env.JOBS_PER_IP_PER_HOUR ?? 3);
const PER_DAY = Number(process.env.JOBS_PER_DAY ?? 60);

const ipHits = new Map<string, number[]>();

export function ipAllowed(ip: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < hour);
  if (hits.length >= PER_IP_PER_HOUR) {
    return { ok: false, retryAfterSeconds: Math.ceil((hits[0] + hour - now) / 1000) };
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear();
  return { ok: true };
}

function dayKey(): string {
  return `limits/${new Date().toISOString().slice(0, 10)}.json`;
}

export async function dailyAllowed(): Promise<{ ok: true; used: number } | { ok: false; used: number }> {
  let used = 0;
  try {
    const info = await head(dayKey());
    const res = await fetch(info.url, { cache: "no-store", headers: { "cache-control": "no-cache" } });
    used = Number(((await res.json()) as { used?: number }).used ?? 0);
  } catch {
    used = 0;
  }
  if (used >= PER_DAY) return { ok: false, used };
  await put(dayKey(), JSON.stringify({ used: used + 1, updatedAt: new Date().toISOString() }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  }).catch(() => undefined);
  return { ok: true, used: used + 1 };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  return (request.headers.get("x-real-ip") ?? fwd.split(",")[0] ?? "unknown").trim() || "unknown";
}
