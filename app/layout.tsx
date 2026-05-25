import type { Metadata } from "next";
import { VT323, Press_Start_2P } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import Taskbar from "@/components/chrome/Taskbar";
import DesktopBg from "@/components/chrome/DesktopBg";
import CRTOverlay from "@/components/chrome/CRTOverlay";
import { SITE } from "@/lib/constants";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: SITE.name,
    description: SITE.tagline,
    type: "website",
    url: SITE.url,
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.tagline,
    images: ["/og.svg"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistMono.variable} ${vt323.variable} ${pressStart2P.variable}`}
    >
      <body className="scanlines vignette min-h-screen">
        <DesktopBg />
        <CRTOverlay />
        <main>{children}</main>
        <Taskbar />
      </body>
    </html>
  );
}
