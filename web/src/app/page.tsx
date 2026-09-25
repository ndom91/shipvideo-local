"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "./cta";

type Mode = "url" | "prompt";
type Job = { jobId: string; mode: Mode; input: string; startedAt: number };
type Poll = { status: "working" | "done" | "error"; phase?: string; videoUrl?: string; message?: string; note?: string };
type HistoryJob = Poll & { jobId: string; mode: Mode; input: string; updatedAt: string; bytes?: number };

const STORAGE = "launchvideo:job";
const EXAMPLES: Record<Mode, string> = {
  url: "https://opencomputer.dev",
  prompt: "A direct launch video for a developer tool that makes LLM inference fast and predictable.",
};

function loadJob(): Job | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as Job) : null;
  } catch {
    return null;
  }
}

function initialJob(): Job | null {
  if (typeof window === "undefined") return null;
  const saved = loadJob();
  return saved && Date.now() - saved.startedAt < 30 * 60 * 1000 ? saved : null;
}

async function requestHistory(): Promise<HistoryJob[]> {
  const response = await fetch("/api/jobs", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load local renders.");
  return ((await response.json()) as { jobs: HistoryJob[] }).jobs;
}

function jobTitle(job: Pick<HistoryJob, "mode" | "input">): string {
  if (job.mode === "url") {
    try {
      return new URL(job.input).hostname.replace(/^www\./, "");
    } catch {
      return job.input;
    }
  }
  return job.input;
}

function relativeTime(value: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("url");
  const [input, setInput] = useState("");
  const [job, setJob] = useState<Job | null>(initialJob);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number | null>(null);

  const refreshHistory = useCallback(async () => {
    try {
      const jobs = await requestHistory();
      startTransition(() => setHistory(jobs));
      setSelectedId((current) => current ?? jobs[0]?.jobId ?? null);
    } catch {
      // The composer remains usable if the history directory is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refreshHistory(), 0);
    return () => window.clearTimeout(timeout);
  }, [refreshHistory]);

  useEffect(() => {
    if (!job) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs/${job.jobId}`, { cache: "no-store" });
        const data = (await res.json()) as Poll;
        if (stopped) return;
        setPoll(data);
        if (data.status === "working") timer.current = window.setTimeout(tick, 2500);
        else {
          localStorage.removeItem(STORAGE);
          void refreshHistory();
          if (data.status === "done") setSelectedId(job.jobId);
        }
      } catch {
        if (!stopped) timer.current = window.setTimeout(tick, 4000);
      }
    };
    tick();
    const clock = window.setInterval(() => setElapsed(Math.floor((Date.now() - job.startedAt) / 1000)), 1000);
    return () => {
      stopped = true;
      if (timer.current) window.clearTimeout(timer.current);
      window.clearInterval(clock);
    };
  }, [job, refreshHistory]);

  const submit = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, input }) });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Could not start");
      const next: Job = { jobId: data.jobId, mode, input, startedAt: Date.now() };
      localStorage.setItem(STORAGE, JSON.stringify(next));
      setPoll(null);
      setElapsed(0);
      setJob(next);
      setSelectedId(data.jobId);
      void refreshHistory();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [input, mode, refreshHistory]);

  const selected = history.find((item) => item.jobId === selectedId) ?? history[0];
  const active = job && (!poll || poll.status === "working");
  const activeDone = job && poll?.status === "done" && poll.videoUrl;

  return (
    <main id="content" tabIndex={-1} className="flex-1 px-5 pb-12 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <Nav />
        <header className="border-b border-line py-8 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Local video workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Create a render</h1>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted sm:mt-0">Claude Code writes the scene. This Mac renders the MP4. Previous work stays in your local library.</p>
        </header>

        <section className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-labelledby="new-render-heading">
          <div>
            <h2 id="new-render-heading" className="sr-only">New render</h2>
            <form onSubmit={(event) => { event.preventDefault(); if (!submitting && input.trim()) void submit(); }} className="border border-line bg-white/[0.02] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
                <div className="flex gap-1" aria-label="Input type">
                  {(["url", "prompt"] as Mode[]).map((item) => (
                    <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === item ? "bg-foreground text-background" : "text-muted hover:bg-white/[0.06] hover:text-foreground"}`}>
                      {item === "url" ? "Website" : "Brief"}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] text-muted">20-40 seconds</span>
              </div>
              <label htmlFor="render-input" className="mt-5 block text-sm font-medium">{mode === "url" ? "Website to study" : "What should this video explain?"}</label>
              {mode === "url" ? (
                <input id="render-input" autoFocus value={input} onChange={(event) => setInput(event.target.value)} placeholder="https://yourproduct.com" inputMode="url" className="mt-2 w-full border-b border-line bg-transparent py-3 text-lg outline-none placeholder:text-muted/60 focus:border-accent" />
              ) : (
                <textarea id="render-input" autoFocus value={input} onChange={(event) => setInput(event.target.value)} placeholder="Describe the product, audience, and the point you want to make." rows={4} className="mt-2 w-full resize-none border-b border-line bg-transparent py-3 text-lg outline-none placeholder:text-muted/60 focus:border-accent" />
              )}
              <div className="mt-5 flex items-center justify-between gap-4">
                <button type="button" onClick={() => setInput(EXAMPLES[mode])} className="text-sm text-muted underline decoration-line underline-offset-4 hover:text-foreground">Use an example</button>
                <button type="submit" disabled={submitting || !input.trim()} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40">
                  {submitting ? "Starting" : "Start render"}
                </button>
              </div>
            </form>
            {error && <p role="alert" className="mt-3 border-l-2 border-red-400 pl-3 text-sm text-red-300">{error}</p>}

            {active && (
              <section className="mt-5 border border-line bg-white/[0.015] p-5" aria-live="polite">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                  <h2 className="font-medium">{poll?.phase ?? "Starting local Claude Code"}</h2>
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
                </div>
                <p className="mt-3 truncate text-sm text-muted">{job.input}</p>
                <p className="mt-5 text-xs text-muted">You can keep working or close this tab. The render will remain in the library when it is complete.</p>
              </section>
            )}

            {activeDone && (
              <section className="mt-5 border border-line bg-black p-3">
                <video src={poll.videoUrl} controls autoPlay playsInline className="aspect-video w-full" />
                <div className="flex items-center justify-between gap-4 px-1 pt-3 text-sm">
                  <span className="text-muted">Latest render</span>
                  <a href={poll.videoUrl} download className="font-medium underline underline-offset-4">Download MP4</a>
                </div>
              </section>
            )}

            {job && poll?.status === "error" && (
              <section className="mt-5 border-l-2 border-red-400 bg-red-400/5 p-4">
                <h2 className="font-medium text-red-200">Render stopped</h2>
                <p className="mt-1 text-sm text-muted">{poll.message ?? "Check the local job log for details."}</p>
              </section>
            )}
          </div>

          <aside className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0" aria-labelledby="library-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="library-heading" className="font-medium">Local library</h2>
              <span className="font-mono text-[11px] text-muted">{history.length} renders</span>
            </div>
            {history.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-muted">Your finished and in-progress renders will appear here.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line" role="list">
                {history.map((item) => (
                  <li key={item.jobId}>
                    <button type="button" onClick={() => setSelectedId(item.jobId)} className={`w-full py-3 text-left ${selected?.jobId === item.jobId ? "text-foreground" : "text-muted hover:text-foreground"}`}>
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">{jobTitle(item)}</span>
                        <span className={`shrink-0 font-mono text-[10px] uppercase tracking-wide ${item.status === "done" ? "text-foreground" : item.status === "error" ? "text-red-300" : "text-accent"}`}>{item.status}</span>
                      </span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-muted">{relativeTime(item.updatedAt)} · {item.mode}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </section>

        {selected?.status === "done" && selected.videoUrl && !activeDone && (
          <section className="border-t border-line py-8" aria-labelledby="selected-render-heading">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Selected render</p>
                <h2 id="selected-render-heading" className="mt-1 text-xl font-semibold">{jobTitle(selected)}</h2>
              </div>
              <a href={selected.videoUrl} download className="text-sm underline underline-offset-4">Download MP4</a>
            </div>
            <video src={selected.videoUrl} controls playsInline className="aspect-video w-full max-w-4xl border border-line bg-black" />
          </section>
        )}

        <footer className="border-t border-line py-6 font-mono text-[11px] text-muted">Local Claude Code · Playwright · ffmpeg</footer>
      </div>
    </main>
  );
}
