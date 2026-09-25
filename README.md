# LaunchVideo (launchvideo.io)

Live: https://launchvideo.io

Paste a URL or a prompt, get a 20 to 40 second launch video. No video model:
Claude Code writes a single HTML film, then this Mac renders it frame by frame
in headless Chromium and encodes it with ffmpeg. It uses the existing Claude
Code login, so it does not require `ANTHROPIC_API_KEY`, OpenComputer, Vercel,
or a Blob store.

```
local/          local Claude Code worker and Playwright + ffmpeg renderer
web/            Next.js app, local job API, and local MP4 streaming route
```

## Run locally

Requirements: Node 22+, the Claude Code CLI logged into a Claude subscription,
and macOS (the renderer has been verified on Apple Silicon).

```bash
claude auth status                 # must show loggedIn: true
npm run setup-local                # installs renderer dependencies and Chromium
cd web && npm install && npm run dev
```

Open http://localhost:3000. Jobs are stored under `web/.local-jobs/`; each
folder contains the prompt, generated HTML, Claude CLI log, and MP4. Set
`CLAUDE_MODEL` to choose a Claude Code model alias, or `CLAUDE_COMMAND` if the
CLI is not on `PATH`.

## How a job flows

1. `POST /api/jobs` validates the input, creates an isolated job folder, and
   launches a detached local worker.
2. The worker calls `claude -p` in that folder. Claude uses its existing
   subscription login to research the source and write `scene.html`.
3. Claude checks the scene with `local/render.mjs --check` and the worker then
   renders it with Playwright's Chromium headless shell and `ffmpeg-static`.
4. `GET /api/jobs/<id>` reads the local state file for progress, and
   `GET /api/videos/<id>` streams the finished MP4 with range support.

Rendering runs at roughly real time: a 30 s film takes 30-40 s on a MacBook Pro.

## Gotchas

- No `<video>`, `<audio>`, `<iframe>`, CSS transitions, `Math.random`, or
  external images in a scene; the worker prompt and renderer enforce this so
  renders stay deterministic.
- The legacy `opencomputer/` source remains as a reference implementation but
  is not used by the local app.
