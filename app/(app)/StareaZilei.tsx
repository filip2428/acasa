"use client";

import { useState, useTransition } from "react";

import { SIMPTOME } from "@/lib/servicii/socoteli-ciclu";

import { spuneCumTeSimti } from "./ciclu/actiuni";

/*
  „Cum te simți azi?” — un tap, nu un formular.

  Se salvează la fiecare atingere, fără buton de „trimite”: dacă e prea greu de
  completat, nu se completează, iar tiparele de pe ecranul ciclului n-ar avea din
  ce să iasă. Răspunsurile se văd doar de cea care le dă; celălalt vede numai
  tiparele strânse din ele.
*/

export default function StareaZilei({
  initiala,
}: {
  initiala: { energie: number | null; simptome: string[] } | null;
}) {
  const [energie, setEnergie] = useState<number | null>(initiala?.energie ?? null);
  const [simptome, setSimptome] = useState<string[]>(initiala?.simptome ?? []);
  const [, porneste] = useTransition();

  function salveaza(nouaEnergie: number | null, noiSimptome: string[]) {
    setEnergie(nouaEnergie);
    setSimptome(noiSimptome);
    porneste(() => spuneCumTeSimti({ energie: nouaEnergie, simptome: noiSimptome }));
  }

  return (
    <div>
      <p className="eticheta">Cum te simți azi?</p>

      <div className="mt-2 flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-[var(--color-creion)]">Energie</span>
        <div className="flex flex-1 justify-between gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const aleasa = energie === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={aleasa}
                aria-label={`Energie ${n} din 5`}
                onClick={() => salveaza(aleasa ? null : n, simptome)}
                className={`cifre flex size-11 items-center justify-center rounded-full border text-sm ${
                  aleasa
                    ? "border-[var(--color-smalt)] bg-[var(--color-smalt)] font-semibold text-[var(--color-portelan)]"
                    : energie != null && n < energie
                      ? "border-[var(--color-smalt-palid)] bg-[var(--color-smalt-palid)] text-[var(--color-smalt-adanc)]"
                      : "border-[var(--color-linie)] bg-[var(--color-portelan)] text-[var(--color-creion)]"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Simptome">
        {SIMPTOME.map((s) => {
          const bifat = simptome.includes(s);
          return (
            <li key={s}>
              <button
                type="button"
                aria-pressed={bifat}
                onClick={() =>
                  salveaza(energie, bifat ? simptome.filter((x) => x !== s) : [...simptome, s])
                }
                className={`buton buton-mic ${bifat ? "buton-principal" : "buton-secundar"}`}
              >
                {s}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
