"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  Scanarea codului de bare cu camera telefonului.

  Două căi, în ordinea preferinței:
  1. `BarcodeDetector`, care e nativ în browser și practic gratuit ca resurse;
  2. ZXing, încărcat abia când chiar se deschide scanerul — Safari pe iPhone nu
     are încă `BarcodeDetector`, iar noi pe iPhone lucrăm.

  Camera merge doar pe HTTPS sau pe localhost. Dacă e refuzată sau nu pornește,
  rămâne introducerea codului de mână — scanarea e un scurtcircuit, nu o condiție.
*/

type DetectorCoduri = {
  detect: (sursa: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};

const FORMATE = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

export default function Scaner({
  deschis,
  laCod,
  laInchidere,
}: {
  deschis: boolean;
  laCod: (cod: string) => void;
  laInchidere: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const trimite = useCallback(
    (cod: string) => {
      if (!/^\d{8,14}$/.test(cod)) return;
      laCod(cod);
    },
    [laCod],
  );

  useEffect(() => {
    if (!deschis) return;

    let flux: MediaStream | null = null;
    let oprit = false;
    let cadru = 0;

    async function porneste() {
      try {
        flux = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (oprit) {
          flux.getTracks().forEach((t) => t.stop());
          return;
        }
        if (video.current) {
          video.current.srcObject = flux;
          await video.current.play();
        }
      } catch {
        setEroare("Nu am acces la cameră. Scrie codul de mai jos.");
        return;
      }

      const Nativ = (window as unknown as { BarcodeDetector?: new (o: unknown) => DetectorCoduri })
        .BarcodeDetector;

      if (Nativ) {
        const detector = new Nativ({ formats: FORMATE });
        const cauta = async () => {
          if (oprit || !video.current) return;
          try {
            const gasite = await detector.detect(video.current);
            if (gasite[0]) return trimite(gasite[0].rawValue);
          } catch {
            // Un cadru neclar nu e o eroare; încercăm la următorul.
          }
          cadru = requestAnimationFrame(cauta);
        };
        cadru = requestAnimationFrame(cauta);
        return;
      }

      // Safari pe iPhone ajunge aici.
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (oprit) return;
      const cititor = new BrowserMultiFormatReader();
      cititor.decodeFromVideoElement(video.current!, (rezultat) => {
        if (rezultat && !oprit) trimite(rezultat.getText());
      });
    }

    porneste();

    return () => {
      oprit = true;
      cancelAnimationFrame(cadru);
      flux?.getTracks().forEach((t) => t.stop());
    };
  }, [deschis, trimite]);

  if (!deschis) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={video}
          playsInline
          muted
          className="size-full object-cover"
          aria-label="Imaginea camerei"
        />
        {/* Chenarul care arată unde să pui codul. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-72 max-w-[80vw] rounded-xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
        </div>
      </div>

      <div
        className="space-y-3 bg-[var(--color-chit)] p-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <p className="text-center text-sm text-[var(--color-creion)]">
          {eroare ?? "Ține codul de bare în chenar."}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            trimite(manual.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="sau scrie codul"
            className="camp cifre flex-1"
            aria-label="Cod de bare scris de mână"
          />
          <button type="submit" className="buton buton-principal">
            Caută
          </button>
        </form>

        <button type="button" onClick={laInchidere} className="buton buton-secundar w-full">
          Renunță
        </button>
      </div>
    </div>
  );
}
