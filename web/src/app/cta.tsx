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
