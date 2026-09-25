import type { Mode } from "./job-types";

export function validateJobInput(body: unknown): { mode: Mode; input: string } {
  const value = (body ?? {}) as { mode?: unknown; input?: unknown };
  const mode: Mode = value.mode === "url" ? "url" : "prompt";
  const input = typeof value.input === "string" ? value.input.trim() : "";
  if (!input)
    throw new Error(mode === "url" ? "Paste a URL." : "Write a prompt.");
  if (input.length > 2000)
    throw new Error(
      mode === "url"
        ? "Keep the URL under 2000 characters."
        : "Keep the prompt under 2000 characters.",
    );
  if (mode === "url") {
    let url: URL;
    try {
      url = new URL(
        /^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`,
      );
    } catch {
      throw new Error("That does not look like a URL.");
    }
    if (!/^https?:$/.test(url.protocol))
      throw new Error("Only http(s) URLs work.");
    return { mode, input: url.toString() };
  }
  return { mode, input };
}
