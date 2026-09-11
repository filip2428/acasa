import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    /*
      Cât ține telefonul minte o secțiune deja deschisă. Implicit, nimic: fiecare
      întoarcere la „Listă” sau „Azi” aștepta din nou serverul. Treizeci de
      secunde înseamnă că treci între secțiuni fără pauză. Orice modificare făcută
      din aplicație golește oricum memoria asta, deci nu vezi date vechi după ce
      ai schimbat ceva; ce a schimbat celălalt apare în cel mult o jumătate de
      minut.
    */
    staleTimes: { dynamic: 30 },
  },
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
