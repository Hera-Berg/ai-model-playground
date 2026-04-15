import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Model Playground",
  description: "Spin up any Hugging Face model on a rented GPU and test it in a chat window.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* IBM Plex via link tags rather than next/font so the build needs no
            network access; the browser loads them at runtime. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
