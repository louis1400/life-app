import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"Groceries · life-app", description:"Your household essentials, learning when you need a refill.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
