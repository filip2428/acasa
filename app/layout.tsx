import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin-ext"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const instrument = Instrument_Sans({
  subsets: ["latin-ext"],
  variable: "--font-instrument",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Acasă",
  description: "Cumpărături, cămară, mese și treburile casei, într-un singur loc.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Acasă", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#1f5138",
  // Aplicația se instalează pe ecranul telefonului; zoom-ul dublu-tap doar
  // încurcă, iar `viewport-fit` lasă antetul să intre sub crestătura ecranului.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function LayoutRadacina({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${fraunces.variable} ${instrument.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
