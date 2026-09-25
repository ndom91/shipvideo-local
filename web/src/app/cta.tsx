"use client";

import { REPO_URL } from "@/lib/links";

export function Nav() {
  return (
    <nav className="flex items-center justify-between gap-4 py-5">
      <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted">launchvideo.io</span>
      <div className="flex items-center gap-3 sm:gap-5">
        <span className="hidden sm:inline text-xs text-muted">Runs locally</span>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-foreground">GitHub</a>
      </div>
    </nav>
  );
}

// Shown right after a video finishes: the moment someone is most likely to
// want the thing that just made it.
export function AfterVideo() {
  return (
    <div className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 p-5">
      <p className="text-base font-semibold">That video was written by Claude Code and rendered on this Mac.</p>
      <p className="mt-1.5 text-sm text-muted">
        The generated scene, local Claude log, and MP4 stay in `web/.local-jobs/`.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-foreground underline underline-offset-4">Read the code</a>
      </div>
    </div>
  );
}
