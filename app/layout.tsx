import type { Metadata } from "next";
import "./globals.css";
import LifeShell from "./life-shell";
export const metadata: Metadata = { title: "Life · Your personal space", description: "Study, groceries, and your saved finds in one place.", icons: {icon: "/favicon.svg"} };
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="en"><body><LifeShell>{children}</LifeShell></body></html>;}
