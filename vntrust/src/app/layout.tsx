import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import { cookies } from "next/headers";
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
  title: "AI VeriGoods | Anti-Counterfeit",
  description: "Bảo vệ Di sản Thương hiệu với AI VeriGoods.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI VeriGoods",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Read userRole cookie để SSR pre-determine layout mode (tránh hydration flash)
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value || '';
  return (
    <html lang="vi" className={`light-mode ${fontManrope.variable} ${fontInter.variable} h-full antialiased`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#1F6FEB" />
      </head>
      <body className="min-h-full flex flex-col font-body selection:bg-[#C8A557]/30 overflow-x-hidden">
        <ClientShell initialRole={userRole}>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}
