"use client";

import { useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";
import { lei } from "@/lib/formatare";
import type { ContPeEcran } from "@/lib/servicii/model-buget";

import { transferuriLunii } from "../actiuni";

type Rand = { categorie: string; plan: number; facut: number; ramas: number; cont: number | null };

/*
  Bifezi ce ai mutat azi. Fiecare transfer intră în buget pe fondul lui și crește
  soldul contului. La un cont în altă monedă (XTB în EUR) suma primită se
  calculează din curs, dar o poți corecta cu cea reală.
*/

export default function Transferuri({ lista, conturi, surse }: { lista: Rand[]; conturi: ContPeEcran[]; surse: ContPeEcran[] }) {
  const [randuri, setRanduri] = useState(() =>
    lista.map((r) => ({ ...r, bifat: r.ramas > 0, suma: r.ramas > 0 ? r.ramas : null as number | null, contAles: r.cont, primit: null as number | null })),
  );
  const [sursa, setSursa] = useState("venit");
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();

  const schimba = (i: number, schimbari: Partial<(typeof randuri)[number]>) =>
    setRanduri((rs) => rs.map((r, j) => (j === i ? { ...r, ...schimbari } : r)));
  const cont = (rand: number | null) => conturi.find((c) => c.rand === rand) ?? null;

  const alese = randuri.filter((r) => r.bifat && (r.suma ?? 0) > 0);
  const total = alese.reduce((t, r) => t + (r.suma ?? 0), 0);

  if (!lista.length) {
    return (
      <p className="card p-4 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
        Luna asta nu e nimic planificat la fonduri sau investiții. Planul se pune în foaia lunii, la categoriile de tip Fond și Avere.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        porneste(async () => {
          const r = await transferuriLunii({
            sursa,
            randuri: alese.map((x) => {
              const c = cont(x.contAles);
              return {
                categorie: x.categorie, suma: x.suma ?? 0, cont: x.contAles,
                primit: c && c.moneda !== "RON" ? (x.primit ?? Math.round(((x.suma ?? 0) / (c.curs || 1)) * 100) / 100) : null,
              };
            }),
          });
          setStare(r);
          if (r.mesaj) setRanduri((rs) => rs.map((x) => (x.bifat ? { ...x, bifat: false, facut: x.facut + (x.suma ?? 0), ramas: Math.max(0, x.ramas - (x.suma ?? 0)), suma: null } : x)));
        });
      }}
    >
      <label className="card block p-4">
        <span className="eticheta">Banii pleacă din</span>
        <select value={sursa} onChange={(e) => setSursa(e.target.value)} className="camp mt-1">
          <option value="venit">Venitul lunii (contul de salariu)</option>
          {surse.map((c) => <option key={c.rand} value={c.rand}>{c.eticheta} — {lei(c.sold)}</option>)}
        </select>
      </label>

      <ul className="space-y-3">
        {randuri.map((r, i) => {
          const c = cont(r.contAles);
          const strain = c != null && c.moneda !== "RON";
          return (
            <li key={r.categorie} className={`card p-4 ${r.bifat ? "" : "opacity-80"}`}>
              <label className="flex min-h-[2.75rem] items-center gap-3">
                <input type="checkbox" checked={r.bifat} onChange={(e) => schimba(i, { bifat: e.target.checked })}
                  className="size-5 accent-[var(--color-smalt)]" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{r.categorie}</span>
                  <span className="block text-xs text-[var(--color-creion)]">
                    plan <span className="cifre">{lei(r.plan)}</span> · mutat <span className="cifre">{lei(r.facut)}</span>
                  </span>
                </span>
                {r.ramas <= 0.5 && <span className="fisa">gata</span>}
              </label>
              {r.bifat && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="eticheta">Lei</span>
                      <CampSuma valoare={r.suma} onValoare={(v) => schimba(i, { suma: v, primit: null })} className="camp cifre mt-1" />
                    </label>
                    {strain ? (
                      <label>
                        <span className="eticheta">Primit ({c!.moneda})</span>
                        <CampSuma
                          valoare={r.primit ?? (r.suma ? Math.round((r.suma / (c!.curs || 1)) * 100) / 100 : null)}
                          onValoare={(v) => schimba(i, { primit: v })} className="camp cifre mt-1" />
                      </label>
                    ) : <span />}
                  </div>
                  <label className="block">
                    <span className="eticheta">În contul</span>
                    <select value={r.contAles ?? ""} onChange={(e) => schimba(i, { contAles: e.target.value ? Number(e.target.value) : null, primit: null })}
                      className="camp mt-1">
                      <option value="">— doar în buget, fără cont —</option>
                      {conturi.map((x) => <option key={x.rand} value={x.rand}>{x.eticheta}{x.scop ? ` (${x.scop})` : ""}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Raspuns stare={stare} />
      <button type="submit" className="buton buton-principal w-full" disabled={seTrimite || alese.length === 0}>
        {seTrimite ? "Se notează…" : alese.length ? `Notează ${alese.length === 1 ? "transferul" : `${alese.length} transferuri`} · ${lei(total, true)}` : "Nimic bifat"}
      </button>
    </form>
  );
}
