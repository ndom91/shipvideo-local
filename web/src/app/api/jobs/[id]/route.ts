import { NextResponse } from "next/server";
import { getLocalJob } from "@/lib/local-jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const jobId = id.replace(/[^a-zA-Z0-9]/g, "");
  if (!jobId) return NextResponse.json({ error: "missing job" }, { status: 400 });
  const state = await getLocalJob(jobId);
  if (!state) return NextResponse.json({ error: "job not found" }, { status: 404 });
  return NextResponse.json({
    ...state,
    videoUrl: state.status === "done" ? `/api/videos/${jobId}` : undefined,
  });
}
