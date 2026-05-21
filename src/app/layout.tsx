import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

const fontManrope = Manrope({ variable: "--font-headline", subsets: ["latin", "vietnamese"] });
const fontInter = Inter({ variable: "--font-body", subsets: ["latin", "vietnamese"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "VNTrust | Anti-Counterfeit",
  description: "Bảo vệ Di sản Thương hiệu với VNTrust.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VNTrust",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${fontManrope.variable} ${fontInter.variable} h-full antialiased`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0B1623" />
      </head>
      <body className="min-h-full flex flex-col font-body selection:bg-cyan-500/30 overflow-x-hidden">
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}
