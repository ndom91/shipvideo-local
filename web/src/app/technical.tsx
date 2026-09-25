const ROWS: Array<[string, string]> = [
  ["Agent", "A detached local worker calls `claude -p` in a job-specific directory. Claude Code uses the existing Claude.ai subscription login; no API key is read."],
  ["Model", "Claude Code's `opus` model alias by default. Set `CLAUDE_MODEL` to choose another model available to your local CLI."],
  ["Runtime", "The worker, browser, encoder, job status, and MP4 all run on this Mac. Each job has its own folder in `web/.local-jobs`."],
  ["Checks", "Claude writes `scene.html` and `scene.json`, then invokes the local checker before the worker accepts and renders the scene."],
  ["Rendering", "No video model. The page's clocks (requestAnimationFrame, timers, Date, CSS and Web Animations) are replaced with a virtual clock, so every frame is a deterministic seek. 1920x1080 at 30 fps, JPEG frames piped into libx264, crf 18."],
  ["Storage", "The completed MP4 stays on disk and is streamed by `/api/videos/:id`. Nothing is uploaded to a cloud storage service."],
];

export function Technical() {
  return (
    <section className="mt-24 border-t border-line pt-12">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">how it runs</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Claude Code and a local renderer.</h2>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        The form launches a local Claude Code worker, polls a local state file, and serves the completed MP4 from this machine.
      </p>
      <dl className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-[140px_1fr]">
        {ROWS.map(([term, detail]) => (
          <div key={term} className="contents">
            <dt className="font-mono text-xs uppercase tracking-wider text-muted md:pt-0.5">{term}</dt>
            <dd className="text-sm leading-relaxed text-foreground/85">
              {detail.split(/(`[^`]+`)/).map((part, i) =>
                part.startsWith("`") ? (
                  <code key={i} className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[12px]">{part.slice(1, -1)}</code>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm text-muted">
        The model writes the film as code, and code renders the same every time.
      </p>
    </section>
  );
}
