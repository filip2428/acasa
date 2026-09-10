import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Acasă",
    short_name: "Acasă",
    description: "Cumpărături, cămară, mese și treburile casei.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#edf0ea",
    theme_color: "#1f5138",
    lang: "ro",
    icons: [
      { src: "/icoana-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icoana-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icoana-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
