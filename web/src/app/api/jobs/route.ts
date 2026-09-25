import { NextResponse } from "next/server";
import { validateJobInput } from "@/lib/job-input";
import { createLocalJob, listLocalJobs, newJobId } from "@/lib/local-jobs";

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

export async function POST(request: Request) {
  let job: ReturnType<typeof validateJobInput>;
  try {
    job = validateJobInput(await request.json());
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
