"use client";

import { useState, useTransition } from "react";

import type { ZonaAfisata } from "@/lib/servicii/casa";

import { adaugaZona, redenumesteZona, scoateZona, type DateSarcina } from "./actiuni";
import FisaSarcina, { dinSarcina, frecventaInCuvinte, sarcinaNoua } from "./FisaSarcina";

/*
  Zonele casei, fiecare cu treburile ei. O zonă se deschide la atingere; totul
  dinăuntru se poate schimba, adăuga sau scoate.
*/

export default function Zone({
  zone,
  persoane,
}: {
  zone: ZonaAfisata[];
  persoane: { id: number; nume: string }[];
}) {
  const [deschisa, setDeschisa] = useState<number | null>(null);
  const [fisa, setFisa] = useState<DateSarcina | null>(null);
  const [zonaNoua, setZonaNoua] = useState("");
  const [seLucreaza, porneste] = useTransition();

  return (
    <>
      <ul className="space-y-3">
        {zone.map((zona) => {
          const esteDeschisa = deschisa === zona.id;
          const minute = zona.sarcini.reduce(
            (t, s) => t + (s.frecventaZile ? (s.minuteEstimate / s.frecventaZile) * 7 : 0),
            0,
          );

          return (
            <li key={zona.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setDeschisa(esteDeschisa ? null : zona.id)}
                aria-expanded={esteDeschisa}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="titlu block text-lg">{zona.nume}</span>
                  <span className="text-xs text-[var(--color-creion)]">
                    {zona.sarcini.length === 0
                      ? "fără treburi"
                      : `${zona.sarcini.length} ${zona.sarcini.length === 1 ? "treabă" : "treburi"}`}
                    {minute > 0 && ` · ~${Math.round(minute)} min pe săptămână`}
                  </span>
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-creion)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className={`shrink-0 transition-transform ${esteDeschisa ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {esteDeschisa && (
                <div className="border-t border-[var(--color-linie)]">
                  <ul>
                    {zona.sarcini.map((sarcina) => (
                      <li key={sarcina.id}>
                        <button
                          type="button"
                          onClick={() => setFisa(dinSarcina(sarcina, zona.id))}
                          className="flex w-full items-baseline gap-3 border-b border-[var(--color-linie)] px-4 py-2.5 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.9375rem]">
                              {sarcina.titlu}
                            </span>
                            <span className="text-xs text-[var(--color-creion)]">
                              {/*
                                Declutterul nu se măsoară în zile: vine când îi
                                ajunge zonei rândul în rotația lunară.
                              */}
                              {sarcina.tip === "declutter"
                                ? "prin rotație, o zonă pe lună"
                                : frecventaInCuvinte(sarcina.frecventaZile)}{" "}
                              · {sarcina.minuteEstimate} min
                              {sarcina.rotatie && " · pe rând"}
                              {sarcina.atribuitLui &&
                                ` · ${persoane.find((p) => p.id === sarcina.atribuitLui)?.nume}`}
                            </span>
                          </span>
                          {sarcina.tip === "declutter" && (
                            <span className="fisa fisa-alama shrink-0">declutter</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    <button
                      type="button"
                      className="buton buton-mic buton-secundar"
                      onClick={() => setFisa(sarcinaNoua(zona.id))}
                    >
                      Adaugă o treabă
                    </button>
                    <button
                      type="button"
                      className="buton buton-mic buton-secundar"
                      onClick={() => {
                        const nume = window.prompt("Cum se numește zona?", zona.nume);
                        if (nume) porneste(() => redenumesteZona(zona.id, nume));
                      }}
                    >
                      Redenumește
                    </button>
                    <button
                      type="button"
                      className="buton buton-mic buton-sters ml-auto"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Scoatem „${zona.nume}” împreună cu treburile ei? Istoricul rămâne.`,
                          )
                        ) {
                          porneste(() => scoateZona(zona.id));
                        }
                      }}
                    >
                      Scoate zona
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const nume = zonaNoua.trim();
          if (!nume) return;
          porneste(async () => {
            await adaugaZona(nume);
            setZonaNoua("");
          });
        }}
        className="flex gap-2"
      >
        <input
          value={zonaNoua}
          onChange={(e) => setZonaNoua(e.target.value)}
          className="camp flex-1"
          placeholder="Adaugă o zonă…"
          aria-label="Adaugă o zonă"
        />
        <button
          type="submit"
          className="buton buton-principal"
          disabled={seLucreaza || zonaNoua.trim() === ""}
        >
          Adaugă
        </button>
      </form>

      {fisa && (
        <FisaSarcina date={fisa} persoane={persoane} laInchidere={() => setFisa(null)} />
      )}
    </>
  );
}
