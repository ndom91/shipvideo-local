"use client";

import { useState } from "react";
import { EXAMPLES, type Example } from "@/lib/examples";

function Card({ example }: { example: Example }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="group">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-black">
        {playing ? (
          <video src={example.videoUrl} poster={example.posterUrl} controls autoPlay playsInline className="h-full w-full" />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="block h-full w-full text-left" aria-label={`Play ${example.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={example.posterUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition group-hover:scale-105">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M4 2.5v11l9-5.5z" /></svg>
              </span>
            </span>
            {example.seconds > 0 && (
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">0:{String(example.seconds).padStart(2, "0")}</span>
            )}
          </button>
        )}
      </div>
      <figcaption className="mt-2.5">
        <p className="text-sm font-medium">{example.title}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted" title={example.input}>
          {example.mode === "url" ? example.input.replace(/^https?:\/\/(www\.)?/, "") : `“${example.input}”`}
        </p>
      </figcaption>
    </figure>
  );
}

export function Examples({ onTry }: { onTry: (mode: "url" | "prompt", input: string) => void }) {
  return (
    <section className="mt-20">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">examples</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Made by this page, untouched.</h2>
        </div>
        <p className="hidden sm:block max-w-xs text-right text-xs text-muted">Each one is a single run: a URL or a prompt in, an MP4 out. No edits.</p>
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((example) => (
          <div key={example.slug}>
            <Card example={example} />
            <button type="button" onClick={() => onTry(example.mode, example.input)} className="mt-1.5 text-[11px] text-muted hover:text-foreground">
              use this input →
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
