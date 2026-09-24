"use client";

import { useState } from "react";
import { CLI_COMMAND, DEPLOY_URL, DOCS_URL, REPO_URL } from "@/lib/links";

export function DeployButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={DEPLOY_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition ${className}`}
    >
      Deploy this agent to OpenComputer
      <span aria-hidden>→</span>
    </a>
  );
}

export function CliCommand() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CLI_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the text is selectable */
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-black/40 px-3 py-2 font-mono text-[12.5px]">
      <span className="text-muted select-none">$</span>
      <code className="flex-1 overflow-x-auto whitespace-nowrap text-foreground/90">{CLI_COMMAND}</code>
      <button type="button" onClick={copy} className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:text-foreground">
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

export function Nav() {
  return (
    <nav className="flex items-center justify-between gap-4 py-5">
      <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted">shipvideo</span>
      <div className="flex items-center gap-3 sm:gap-5">
        <span className="hidden sm:inline text-xs text-muted">Built on OpenComputer</span>
        <a href={DOCS_URL} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-foreground">Docs</a>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-foreground">GitHub</a>
        <a href={DEPLOY_URL} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90 transition">
          Deploy your own
        </a>
      </div>
    </nav>
  );
}

// Shown right after a video finishes: the moment someone is most likely to
// want the thing that just made it.
export function AfterVideo() {
  return (
    <div className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 p-5">
      <p className="text-base font-semibold">That video came out of one serverless agent, and you can run it yourself.</p>
      <p className="mt-1.5 text-sm text-muted">
        One agent file, three tools, no servers. Deploy a copy to your OpenComputer account in a click and it will run the same way, with your own model access and billing.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DeployButton />
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-foreground underline underline-offset-4">Read the code</a>
      </div>
      <div className="mt-3">
        <CliCommand />
      </div>
    </div>
  );
}

export function TryCta() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <a href={DEPLOY_URL} target="_blank" rel="noreferrer" className="rounded-xl bg-white p-4 text-black hover:bg-white/90 transition">
        <p className="text-sm font-semibold">Deploy this agent</p>
        <p className="mt-1 text-xs text-black/60">One click. Free account, the agent lands in your project with its tools and prompt.</p>
      </a>
      <a href={REPO_URL} target="_blank" rel="noreferrer" className="rounded-xl border border-line p-4 hover:border-foreground/40 transition">
        <p className="text-sm font-semibold">Clone the repo</p>
        <p className="mt-1 text-xs text-muted">diggerhq/shipvideo: the agent, the renderer, and this web app.</p>
      </a>
      <a href={DOCS_URL} target="_blank" rel="noreferrer" className="rounded-xl border border-line p-4 hover:border-foreground/40 transition">
        <p className="text-sm font-semibold">Build your own agent</p>
        <p className="mt-1 text-xs text-muted">The quickstart: a TypeScript file, a deploy, a session. Ten minutes.</p>
      </a>
    </div>
  );
}
