import { defineTool } from "@opencomputer/agent";

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

// Pull the bits of a page that matter for a launch video: title, description,
// social tags, headings, and the colors the site actually uses.
function extractMeta(html: string) {
  const pick = (re: RegExp) => html.match(re)?.[1]?.trim() ?? null;
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    ?? pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogDescription = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const themeColor = pick(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']*)["']/i);
  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => htmlToText(m[2]))
    .filter((h) => h && h.length < 160)
    .slice(0, 25);
  const colorCounts = new Map<string, number>();
  for (const m of html.matchAll(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const c = m[0].toLowerCase();
    colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
  }
  const colors = [...colorCounts.entries()]
    .filter(([c]) => !["#fff", "#ffffff", "#000", "#000000"].includes(c))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c, n]) => `${c} (${n})`);
  const fonts = [...new Set([...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi)].map((m) => decodeURIComponent(m[1]).replace(/\+/g, " ")))].slice(0, 5);
  return { title, description, ogTitle, ogDescription, themeColor, headings, colors, fonts };
}

export const webFetch = defineTool({
  name: "web_fetch",
  description:
    "Fetch a public URL. Returns the page text (HTML stripped) plus extracted metadata: title, description, headings, the hex colors the site uses most, and Google Fonts it loads. Use it to understand a product before writing its video. No authentication is sent.",
  input: {
    type: "object",
    properties: {
      url: { type: "string" },
      maxCharacters: { type: "integer", minimum: 500, maximum: 60000, description: "Default 12000." },
    },
    required: ["url"],
    additionalProperties: false,
  },
  async run({ input, signal }) {
    const url = new URL(String(input.url));
    if (!/^https?:$/.test(url.protocol)) throw new Error("Only http(s) URLs are allowed.");
    const response = await fetch(url, {
      signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 shipvideo/1.0",
        Accept: "text/html,application/xhtml+xml,application/json,text/plain,*/*",
      },
    });
    const type = response.headers.get("content-type") ?? "";
    const body = await response.text();
    const max = Math.min(Number(input.maxCharacters ?? 12000), 60000);
    const isHtml = /html/i.test(type);
    const text = isHtml ? htmlToText(body) : body;
    return {
      status: response.status,
      url: response.url,
      contentType: type,
      meta: isHtml ? extractMeta(body) : null,
      truncated: text.length > max,
      text: text.slice(0, max),
    };
  },
});
