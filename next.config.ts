import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    // Pozele produselor vin de la Open Food Facts (scanare cod de bare)
    // și din stocarea proprie (Vercel Blob).
    remotePatterns: [
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
};

export default config;
