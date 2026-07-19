import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "OfferHub — the Web3 offer search engine",
    template: "%s · OfferHub",
  },
  description:
    "Every Web3 offerwall in one search. Compare rewards across AdGem, BitLabs, CPX and more — filter by country, device and payout.",
  openGraph: {
    type: "website",
    siteName: "OfferHub",
    title: "OfferHub — the Web3 offer search engine",
    description:
      "Every Web3 offerwall in one search. Compare rewards, filter by country and device, start earning faster.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "OfferHub — the Web3 offer search engine",
    description: "Every Web3 offerwall in one search.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
