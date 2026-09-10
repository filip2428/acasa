"use client";

import { useOptimistic, useTransition } from "react";

import type { DeclutterulLunii, TreabaScadenta } from "@/lib/domeniu";

import { amanaZonaDeDeclutter, bifeazaTreaba } from "./actiuni";

/*
  Treburile de azi.

  Arătăm cel mult câteva: o listă cu tot ce e restant nu îndeamnă pe nimeni la
  nimic, doar face rău. Restul stau în ecranul Casa.
*/

export default function Treburi({
  treburi,
  declutter,
  persoane,
  eu,
}: {
  treburi: TreabaScadenta[];
  declutter: DeclutterulLunii | null;
  persoane: { id: number; nume: string }[];
  eu: number;
}) {
  const [facute, marcheaza] = useOptimistic<number[], number>([], (stare, id) => [...stare, id]);
  const [, porneste] = useTransition();

  const ramase = treburi.filter((t) => !facute.includes(t.id));
  const aratate = ramase.slice(0, 4);

  function bifeaza(id: number) {
    porneste(async () => {
      marcheaza(id);
      await bifeazaTreaba(id);
    });
  }

  const arataDeclutter = declutter && !declutter.facut && !facute.includes(declutter.sarcinaId ?? -1);

  if (aratate.length === 0 && !arataDeclutter) {
    return (
      <section className="card p-4">
        <span className="eticheta">Treburi</span>
        <p className="titlu mt-1 text-xl">Nimic scadent</p>
        <p className="mt-1 text-sm text-[var(--color-creion)]">
          Casa e la zi. Următoarele apar când le vine rândul.
        </p>
      </section>
    );
  }

  return (
    <>
      {aratate.length > 0 && (
        <section>
          <div className="mb-1.5 flex items-baseline justify-between px-1">
            <h2 className="eticheta">De făcut</h2>
            {ramase.length > aratate.length && (
              <span className="text-xs text-[var(--color-creion)]">
                și încă {ramase.length - aratate.length}
              </span>
            )}
          </div>

          <ul className="card card-lipit overflow-hidden">
            {aratate.map((treaba) => (
              <li key={treaba.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  aria-label={`Marchează ca făcut: ${treaba.titlu}`}
                  onClick={() => bifeaza(treaba.id)}
                  className="size-[1.625rem] shrink-0 rounded-full border-2 border-[var(--color-linie)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem]">{treaba.titlu}</span>
                  <span className="text-xs text-[var(--color-creion)]">
                    {treaba.zona} · {treaba.minuteEstimate} min
                    {treaba.atribuitLui && treaba.atribuitLui !== eu
                      ? ` · ${persoane.find((p) => p.id === treaba.atribuitLui)?.nume}`
                      : ""}
                  </span>
                </span>
                {treaba.intarziere > 2 && (
                  <span className="fisa fisa-caramida shrink-0">
                    {treaba.intarziere > 30
                      ? "demult"
                      : `+${treaba.intarziere} ${treaba.intarziere === 1 ? "zi" : "zile"}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {arataDeclutter && declutter && (
        <section className="card p-4">
          <span className="eticheta">Declutterul lunii</span>
          <p className="titlu mt-1 text-xl">{declutter.zona}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-creion)]">
            O singură zonă pe lună. Într-un an ați trecut prin toată casa fără să
            simțiți că e mare lucru.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="buton buton-secundar buton-mic flex-1"
              onClick={() => porneste(() => amanaZonaDeDeclutter())}
            >
              Altă zonă
            </button>
            {declutter.sarcinaId && (
              <button
                type="button"
                className="buton buton-principal buton-mic flex-1"
                onClick={() => bifeaza(declutter.sarcinaId!)}
              >
                Am făcut-o
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
