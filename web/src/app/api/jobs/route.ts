import { NextResponse } from "next/server";
import {
  createLocalJob,
  listLocalJobs,
  type Mode,
  newJobId,
} from "@/lib/local-jobs";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const jobs = await listLocalJobs();
  return NextResponse.json({
    jobs: jobs.map((job) => ({
      ...job,
      videoUrl: job.status === "done" ? `/api/videos/${job.jobId}` : undefined,
    })),
  });
}

function validate(body: unknown): { mode: Mode; input: string } {
  const b = (body ?? {}) as { mode?: unknown; input?: unknown };
  const mode: Mode = b.mode === "url" ? "url" : "prompt";
  const input = typeof b.input === "string" ? b.input.trim() : "";
  if (!input)
    throw new Error(mode === "url" ? "Paste a URL." : "Write a prompt.");
  if (mode === "url") {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    } catch {
      throw new Error("That does not look like a URL.");
    }
    if (!/^https?:$/.test(url.protocol))
      throw new Error("Only http(s) URLs work.");
    return { mode, input: url.toString() };
  }
  if (input.length > 2000)
    throw new Error("Keep the prompt under 2000 characters.");
  return { mode, input };
}

export async function POST(request: Request) {
  let job: { mode: Mode; input: string };
  try {
    job = validate(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bad request" },
      { status: 400 },
    );
  }
  const jobId = newJobId();
  try {
    await createLocalJob({ jobId, mode: job.mode, input: job.input });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start the local worker",
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ jobId });
}
