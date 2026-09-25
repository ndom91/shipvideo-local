# Local Video Workspace

## Intent

This is a personal local-production tool, not a marketing site. It should feel
like a quiet render desk: direct, chronological, and useful when returning to
work already in progress.

## Design Direction

- Lead with a compact composer labelled "Create a render", not a large hero.
- Keep the active job and persistent local library in the first viewport.
- Use the render ledger as the signature element: source, status, mode, and
  recency in a narrow chronological list beside the composer.
- Show only the selected historical MP4 to avoid a wall of auto-playing media.
- Prefer factual local-language copy: Claude Code, this Mac, local library,
  render. Avoid claims, deployment calls to action, and technical explainers in
  the primary workflow.

## Visual System

- Color world: near-black workbench, off-white text, graphite rules, muted
  violet only for the primary action and active work.
- Depth: borders only. Surfaces are almost indistinguishable from the page;
  no decorative gradients or prominent shadows.
- Spacing: use the existing Tailwind 4px scale. The desktop workspace has a
  broad composer and a 20rem library rail; mobile stacks them with a horizontal
  divider.
- Typography: Inter for instructions and actions, JetBrains Mono for labels,
  timestamps, durations, and status metadata.
- Corners: small (`rounded-md`) on controls; panels stay square and technical.

## Interaction Patterns

- The local library is a semantic list of native buttons. Selecting an item
  loads its video below the workspace.
- Use explicit text status (`done`, `working`, `error`) in addition to color.
- Keep errors inline with `role="alert"`; active rendering uses a restrained
  polite live region.
- Maintain visible focus styles through native controls and existing browser
  focus treatment.
- Preserve `main#content` as the primary application landmark.

## Avoid

- Do not restore the sample-video gallery, sales hero, deployment CTA, or long
  technical explainer to the main route.
- Do not turn the library into generic dashboard cards or a metrics grid.
- Do not add more accent colors, large rounded cards, or dramatic shadows.
