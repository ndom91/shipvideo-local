# LaunchVideo - local Claude Code edition

Paste a URL or a prompt, get a 20 to 40 second launch video. No video model
required.

Claude Code writes a single HTML film, then your computer renders it frame by frame
in headless Chromium and records it with ffmpeg. Compatible with whatever
Claude Code login you use (subscription or API key).

This fork is intended for local use. It launches Claude Code and renders video
on the same machine running the small local Next.js app.

![LaunchVideo local workspace, showing the render composer and local video library](./.github/assets/example_001.png)

## Example Video

https://github.com/user-attachments/assets/710fde43-9dce-44fd-ae2d-7c3f28435121

## Quick Start

Requirements:

- Linux or macOS
- Node.js 24 LTS
- Claude Code installed and logged in

```bash
# Clone the fork
git clone https://github.com/ndom91/shipvideo-local
cd shipvideo-local

# Install workspace dependencies, Playwright, and its copy of headless Chromium
pnpm setup-local

# Start the web app where you can enter any prompt / URL input to generate a video
pnpm dev
```

Open http://localhost:3000 and submit either a URL or a brief.

## Configuration

The defaults require no environment file. Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CLAUDE_MODEL` | `opus` | A Claude Code model alias, such as `sonnet` or `opus`. |
| `CLAUDE_COMMAND` | `claude` | Path to the Claude Code executable if it is not on `PATH`. |

For example:

```bash
CLAUDE_MODEL=sonnet pnpm dev
```

Run that command from the repository root after installing dependencies.

## How it works

### Local Files

Each request gets an isolated directory at `web/.local-jobs/<job-id>/`:

- `job.json`: validated form input.
- `scene.html` and `scene.json`: Claude's generated film and duration.
- `claude.log`: Claude Code and renderer output for debugging.
- `video.mp4`: completed output.
- `state.json`: job status consumed by the UI.

These directories are ignored by Git. The completed MP4 is streamed locally at
`/api/videos/<job-id>`; it is not uploaded anywhere.

Completed jobs are retained for up to 30 days, with the newest 50 kept. Active
jobs are never removed by this cleanup.

### How a job flows

1. `POST /api/jobs` validates the input, creates an isolated job folder, and
   launches a detached local worker.
2. The worker calls `claude -p` in that folder. Claude uses its existing
   subscription login to research the source and write `scene.html`.
3. The worker checks the scene with `local/render.mjs --check`, then renders it
   with Playwright's Chromium headless shell and `ffmpeg-static`.
4. `GET /api/jobs/<id>` reads the local state file for progress, and
   `GET /api/videos/<id>` streams the finished MP4 with range support.

Rendering runs at roughly real time: a 30 s film takes 30-40 s on a MacBook Pro.

### Gotchas

- No `<video>`, `<audio>`, `<iframe>`, CSS transitions, `Math.random`, or
  external images in a scene; the worker prompt and renderer enforce this so
  renders stay deterministic.
- The job worker only permits Claude Code's file tools and WebFetch. It does
  not grant shell access.
- URL mode asks Claude to read a public site. Treat submitted URLs as untrusted
  content and keep this app bound to localhost unless you add authentication
  and network restrictions.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Job fails immediately | Run `claude auth status`; it must report `loggedIn: true`. |
| Renderer cannot launch Chromium | Re-run `pnpm setup-local` from the repository root. |
| Job says scene validation failed | Read `web/.local-jobs/<job-id>/claude.log`; Claude's generated `scene.html` is alongside it. |
| `claude` is not found | Set `CLAUDE_COMMAND` to its full path before starting `pnpm dev`. |
