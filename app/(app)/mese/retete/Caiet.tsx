"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { RetetaAfisata } from "@/lib/domeniu";
import { cuDe } from "@/lib/formatare";

import FisaReteta, { retetaNoua } from "./FisaReteta";

/*
  Caietul de rețete.

  Filtrele sunt puține și sunt exact întrebările pe care și le pune cineva în
  fața frigiderului: ce pot face acum, ce facem la Thermomix, ce ne place.
*/

const FILTRE = [
  { valoare: "toate", eticheta: "Toate" },
  { valoare: "acum", eticheta: "Se pot face acum" },
  { valoare: "tm6", eticheta: "La Thermomix" },
  { valoare: "favorite", eticheta: "Favorite" },
] as const;

type Filtru = (typeof FILTRE)[number]["valoare"];

export default function Caiet({ retete }: { retete: RetetaAfisata[] }) {
  const [filtru, setFiltru] = useState<Filtru>("toate");
  const [termen, setTermen] = useState("");
  const [fisa, setFisa] = useState(false);

  const gasite = useMemo(() => {
    const curat = termen.trim().toLowerCase();
    return retete.filter((r) => {
      if (curat && !r.titlu.toLowerCase().includes(curat)) return false;
      if (filtru === "acum") return r.dinTotal > 0 && r.ai === r.dinTotal;
      if (filtru === "tm6") return r.laTm6;
      if (filtru === "favorite") return r.favorit;
      return true;
    });
  }, [retete, termen, filtru]);

  return (
    <>
      {retete.length > 0 && (
        <>
          <input
            value={termen}
            onChange={(e) => setTermen(e.target.value)}
            className="camp"
            type="search"
            placeholder="Caută în rețete…"
            aria-label="Caută în rețete"
          />

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {FILTRE.map((f) => (
              <button
                key={f.valoare}
                type="button"
                onClick={() => setFiltru(f.valoare)}
                aria-pressed={filtru === f.valoare}
                className={`buton buton-mic shrink-0 ${
                  filtru === f.valoare ? "buton-principal" : "buton-secundar"
                }`}
              >
                {f.eticheta}
              </button>
            ))}
          </div>
        </>
      )}

      {retete.length === 0 ? (
        <p className="px-1 py-8 text-center text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
          Caietul e gol. Pune întâi rețetele pe care le faceți oricum — cele pe
          care le știți pe de rost sunt exact cele care trebuie propuse marțea
          seara.
        </p>
      ) : gasite.length === 0 ? (
        <p className="px-1 py-8 text-center text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
          Nimic aici.
        </p>
      ) : (
        <ul className="card card-lipit overflow-hidden">
          {gasite.map((r) => (
            <li key={r.id}>
              <Link
                href={`/mese/retete/${r.id}`}
                className="flex items-center gap-3 px-3.5 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem]">
                    {r.favorit && <span aria-label="favorită">★ </span>}
                    {r.titlu}
                  </span>
                  <span className="text-xs text-[var(--color-creion)]">
                    {[
                      r.minuteTotal ? cuDe(r.minuteTotal, "minute") : null,
                      r.laTm6 ? "Thermomix" : null,
                      r.dinTotal > 0 ? `ai ${r.ai} din ${r.dinTotal}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>

                {r.expiraInEa.length > 0 ? (
                  <span className="fisa fisa-alama shrink-0">folosește ce expiră</span>
                ) : r.dinTotal > 0 && r.ai === r.dinTotal ? (
                  <span className="fisa shrink-0">ai tot</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="buton buton-principal w-full"
        onClick={() => setFisa(true)}
      >
        Adaugă o rețetă
      </button>

      {fisa && (
        <FisaReteta date={retetaNoua()} mergiLaEa laInchidere={() => setFisa(false)} />
      )}
    </>
  );
}
