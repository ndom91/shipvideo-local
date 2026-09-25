export type Mode = "url" | "prompt";

export type LocalJobState = {
  status: "working" | "done" | "error";
  phase: string;
  updatedAt: string;
  bytes?: number;
  message?: string;
  note?: string;
};

export type LocalJobSummary = LocalJobState & {
  jobId: string;
  mode: Mode;
  input: string;
};

export type LocalJobResponse = LocalJobState & {
  videoUrl?: string;
};
