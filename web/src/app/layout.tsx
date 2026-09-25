import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

const SITE = "https://launchvideo.io";
const DESCRIPTION = "Create launch videos locally with Claude Code, Playwright, and ffmpeg. No video model or API key required.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "LaunchVideo",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "LaunchVideo: a launch video from a URL or a prompt",
    description: DESCRIPTION,
    url: SITE,
    siteName: "LaunchVideo",
    type: "website",
    images: [{ url: "https://gzvxcspoxhhgoeog.public.blob.vercel-storage.com/examples/infera-gXTtuX8hOzbsPSy3SAAdqKElG42trA.jpg", width: 1280, height: 720, alt: "End card of a launch video made by LaunchVideo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LaunchVideo",
    description: DESCRIPTION,
    images: ["https://gzvxcspoxhhgoeog.public.blob.vercel-storage.com/examples/infera-gXTtuX8hOzbsPSy3SAAdqKElG42trA.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
