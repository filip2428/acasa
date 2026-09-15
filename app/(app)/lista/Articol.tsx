"use client";

import { useOptimistic, useState, useTransition } from "react";

import { citesteSuma, lei, sumaInCamp } from "@/lib/formatare";
import type { ArticolAfisat } from "@/lib/servicii/lista";

import { comutaBifat, schimbaCantitatea, schimbaPretul, stergeArticol } from "./actiuni";

/*
  Un rând din listă.

  Bifarea se face optimist: în magazin, cu semnal prost, un rând care așteaptă
  răspunsul de la server înainte să se taie e insuportabil. Dacă serverul dă
  greș, `useOptimistic` readuce singur valoarea reală la revalidare.
*/

export default function Articol({ articol }: { articol: ArticolAfisat }) {
  const [, porneste] = useTransition();
  const [bifat, bifaOptimist] = useOptimistic(articol.bifat);
  const [deschis, setDeschis] = useState(false);

  const valoare = articol.pretEstimat != null ? articol.pretEstimat * articol.cantitate : null;

  return (
    <div className={bifat ? "opacity-45" : undefined}>
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={bifat}
          aria-label={`${bifat ? "Scoate din coș" : "Pune în coș"}: ${articol.nume}`}
          onClick={() =>
            porneste(async () => {
              bifaOptimist(!bifat);
              await comutaBifat(articol.id, !bifat);
            })
          }
          className={`flex size-[1.625rem] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            bifat
              ? "border-[var(--color-smalt)] bg-[var(--color-smalt)] text-white"
              : "border-[var(--color-linie)]"
          }`}
        >
          {bifat && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => setDeschis((d) => !d)}
          aria-expanded={deschis}
          className="min-w-0 flex-1 text-left"
        >
          <span className={`block truncate text-[0.9375rem] ${bifat ? "line-through" : ""}`}>
            {articol.nume}
          </span>
          {articol.cantitate !== 1 && (
            <span className="cifre text-xs text-[var(--color-creion)]">
              {new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(articol.cantitate)}{" "}
              {articol.unitate}
            </span>
          )}
        </button>

        <span className="cifre shrink-0 text-sm text-[var(--color-creion)]">
          {valoare != null ? lei(valoare) : "—"}
        </span>
      </div>

      {deschis && (
        <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3">
          <div className="flex items-center gap-1">
            <BulinaCantitate
              semn="−"
              eticheta="Scade cantitatea"
              onClick={() =>
                porneste(() => schimbaCantitatea(articol.id, articol.cantitate - 1))
              }
            />
            <span className="cifre w-12 text-center text-sm">
              {new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(articol.cantitate)}
            </span>
            <BulinaCantitate
              semn="+"
              eticheta="Crește cantitatea"
              onClick={() =>
                porneste(() => schimbaCantitatea(articol.id, articol.cantitate + 1))
              }
            />
          </div>

          <label className="flex items-center gap-1.5">
            <span className="sr-only">Preț pe {articol.unitate}</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={sumaInCamp(articol.pretEstimat)}
              placeholder="preț"
              onBlur={(e) => {
                const nou = citesteSuma(e.target.value);
                if (nou !== articol.pretEstimat) {
                  porneste(() => schimbaPretul(articol.id, nou));
                }
              }}
              className="camp cifre h-9 max-h-9 w-24 min-h-0 px-2 text-sm"
            />
            <span className="text-xs text-[var(--color-creion)]">lei</span>
          </label>

          <button
            type="button"
            onClick={() => porneste(() => stergeArticol(articol.id))}
            className="buton buton-mic buton-sters ml-auto"
          >
            Șterge
          </button>
        </div>
      )}
    </div>
  );
}

function BulinaCantitate({
  semn,
  eticheta,
  onClick,
}: {
  semn: string;
  eticheta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={eticheta}
      className="flex size-9 items-center justify-center rounded-lg border border-[var(--color-linie)] bg-white text-base leading-none"
    >
      {semn}
    </button>
  );
}
