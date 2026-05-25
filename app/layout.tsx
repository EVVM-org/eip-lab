import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import Nav from "@/components/chrome/Nav";
import Footer from "@/components/chrome/Footer";
import Scanlines from "@/components/chrome/Scanlines";
import { SITE } from "@/lib/constants";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
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
    <html lang="en" className={`${GeistMono.variable} ${vt323.variable}`}>
      <body className="scanlines vignette min-h-screen">
        <Scanlines />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
