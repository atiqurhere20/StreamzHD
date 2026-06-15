import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://streamz-hd.example.com";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "StreamZ HD";
const APP_DESC = "Watch live news, sports, movies and entertainment channels in HD. Stream globally, instantly.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${APP_NAME} — Premium IPTV Streaming`, template: `%s | ${APP_NAME}` },
  description: APP_DESC,
  manifest: "/manifest.json",
  applicationName: APP_NAME,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESC,
    url: APP_URL,
    siteName: APP_NAME,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: APP_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESC,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#ff6a00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

import { BottomNav } from "@/components/layout/BottomNav";
import { AdSlot } from "@/components/ui/AdSlot";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full overflow-hidden`}>
      <body className="h-full flex flex-col justify-between bg-bg text-text overflow-hidden select-none">
        <AdSlot position="global_header" />
        <div className="flex-grow overflow-y-auto min-h-0 select-text pb-16 md:pb-0">
          {children}
        </div>
        <BottomNav />
        <AdSlot position="global_body" />
      </body>
    </html>
  );
}
