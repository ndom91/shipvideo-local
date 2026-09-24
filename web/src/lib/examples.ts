// Videos made by this exact pipeline, copied to stable paths in the Blob store.
// Posters are the end-card frame of each film.
export type Example = {
  slug: string;
  title: string;
  mode: "url" | "prompt";
  input: string;
  seconds: number;
  videoUrl: string;
  posterUrl: string;
};

const BASE = "https://gzvxcspoxhhgoeog.public.blob.vercel-storage.com/examples";

export const EXAMPLES: Example[] = [
  {
    slug: "nvidia",
    title: "NVIDIA",
    mode: "url",
    input: "https://www.nvidia.com",
    seconds: 31,
    videoUrl: `${BASE}/nvidia.mp4`,
    posterUrl: `${BASE}/nvidia-ZsqaElE6aA9nnruylvlkhKtiYVdT9s.jpg`,
  },
  {
    slug: "jev",
    title: "Jev, by TypeSafe AI",
    mode: "url",
    input: "https://typesafe.ai",
    seconds: 34,
    videoUrl: `${BASE}/jev.mp4`,
    posterUrl: `${BASE}/jev-SeW6q5kkaWJje2dTzgUxvtFNuiGVfl.jpg`,
  },
  {
    slug: "opencomputer",
    title: "OpenComputer",
    mode: "url",
    input: "https://opencomputer.dev",
    seconds: 33,
    videoUrl: `${BASE}/opencomputer.mp4`,
    posterUrl: `${BASE}/opencomputer-pNJARuzJeXvHeyV7YPbLREG66Hn8Mu.jpg`,
  },
  {
    slug: "linear",
    title: "Linear",
    mode: "url",
    input: "https://linear.app",
    seconds: 34,
    videoUrl: `${BASE}/linear.mp4`,
    posterUrl: `${BASE}/linear-SWISP8izvU7SorXCjFwmASQpwzbZ0N.jpg`,
  },
  {
    slug: "infera",
    title: "Infera (from a prompt)",
    mode: "prompt",
    input: "make a modern slick and punchy video for a modern startup that works on inference",
    seconds: 32,
    videoUrl: `${BASE}/infera.mp4`,
    posterUrl: `${BASE}/infera-gXTtuX8hOzbsPSy3SAAdqKElG42trA.jpg`,
  },
];
