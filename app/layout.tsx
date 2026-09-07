import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Archive — Your internet, kept",
  description: "Save links and files, organize your finds, and return to what matters.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
