"use client";

import { useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";
import { lei } from "@/lib/formatare";
import type { ContPeEcran } from "@/lib/servicii/model-buget";

import { actualizeazaSolduri } from "../actiuni";

/*
  Ritualul de la sfârșit de lună: deschizi aplicațiile băncilor și scrii soldul
  de azi doar unde s-a schimbat (dobândă, piață). Diferența rămâne în istoric.
*/

export default function Solduri({ conturi }: { conturi: ContPeEcran[] }) {
  const [solduri, setSolduri] = useState<Record<number, number | null>>(() => Object.fromEntries(conturi.map((c) => [c.rand, c.sold])));
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();
  const schimbate = conturi.filter((c) => solduri[c.rand] != null && Math.abs((solduri[c.rand] ?? 0) - c.sold) >= 0.005);

  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      porneste(async () => setStare(await actualizeazaSolduri(schimbate.map((c) => ({ rand: c.rand, sold: solduri[c.rand] ?? 0 })))));
    }}>
      <ul className="card card-lipit overflow-hidden">
        {conturi.map((c) => {
          const schimbat = schimbate.includes(c);
          return (
            <li key={c.rand} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem]">{c.eticheta}</span>
                <span className="block truncate text-xs text-[var(--color-creion)]">
                  {c.scop || "fără scop"} · acum <span className="cifre">{lei(c.sold).replace(" lei", ` ${c.moneda}`)}</span>
                </span>
              </span>
              <div className="w-32 shrink-0">
                <CampSuma valoare={solduri[c.rand] ?? null} onValoare={(v) => setSolduri((s) => ({ ...s, [c.rand]: v }))}
                  aria-label={`Soldul nou pentru ${c.eticheta}`}
                  className={`camp cifre text-right ${schimbat ? "!border-[var(--color-alama)]" : ""}`} />
              </div>
            </li>
          );
        })}
      </ul>
      <Raspuns stare={stare} />
      <button type="submit" className="buton buton-principal w-full" disabled={seTrimite || schimbate.length === 0}>
        {seTrimite ? "Se salvează…" : schimbate.length ? `Salvează ${schimbate.length === 1 ? "un sold" : `${schimbate.length} solduri`}` : "Nicio schimbare"}
      </button>
    </form>
  );
}
