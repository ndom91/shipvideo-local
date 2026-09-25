import { createReadStream, type Stats } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { localVideoPath } from "@/lib/local-jobs";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const jobId = id.replace(/[^a-zA-Z0-9]/g, "");
  if (!jobId) return new NextResponse("missing video", { status: 400 });
  let info: Stats;
  try {
    info = await stat(localVideoPath(jobId));
  } catch {
    return new NextResponse("video not found", { status: 404 });
  }
  const range = request.headers.get("range");
  if (!range) {
    return new NextResponse(
      Readable.toWeb(createReadStream(localVideoPath(jobId))) as ReadableStream,
      {
        headers: {
          "accept-ranges": "bytes",
          "content-length": String(info.size),
          "content-type": "video/mp4",
        },
      },
    );
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2]))
    return new NextResponse(null, {
      status: 416,
      headers: { "content-range": `bytes */${info.size}` },
    });
  const end = match[2]
    ? Math.min(Number(match[2]), info.size - 1)
    : info.size - 1;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, info.size - Number(match[2]));
  if (start < 0 || end < start || start >= info.size)
    return new NextResponse(null, {
      status: 416,
      headers: { "content-range": `bytes */${info.size}` },
    });
  const length = end - start + 1;
  return new NextResponse(
    Readable.toWeb(
      createReadStream(localVideoPath(jobId), { start, end }),
    ) as ReadableStream,
    {
      status: 206,
      headers: {
        "accept-ranges": "bytes",
        "content-length": String(length),
        "content-range": `bytes ${start}-${end}/${info.size}`,
        "content-type": "video/mp4",
      },
    },
  );
}
