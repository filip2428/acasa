"use client";

import { useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";
import { lei, ziLunga } from "@/lib/formatare";
import type { ContPeEcran } from "@/lib/servicii/model-buget";

import { scadenta } from "../actiuni";
import { Confirmare } from "../ui";

type Depozit = ContPeEcran & { luni: number | null; zileRamase: number | null; dobandaEstimata: number; estimataSigur: boolean };
type Proprietati = { depozite: Depozit[]; conturi: ContPeEcran[]; ales: number | null };

/*
  La scadență: dobânda precompletată (corecteaz-o cu cea din aplicația băncii),
  apoi prelungești — cu dobânda în depozit sau într-un cont — ori lichidezi.

  După o operație reușită formularul dispare: rămas pe ecran, ar putea adăuga
  dobânda a doua oară, iar un depozit lichidat nici nu mai e în listă.
*/

export default function Scadenta(proprietati: Proprietati) {
  const [gata, setGata] = useState<string | null>(null);
  if (gata) return <Confirmare mesaj={gata} />;
  if (!proprietati.depozite.length) {
    return <p className="card p-4 text-[0.9375rem] text-[var(--color-creion)]">Nu ai depozite sau titluri de stat cu sold.</p>;
  }
  return <Formular {...proprietati} laSucces={setGata} />;
}

function Formular({ depozite, conturi, ales, laSucces }: Proprietati & { laSucces: (mesaj: string) => void }) {
  const [rand, setRand] = useState(ales && depozite.some((d) => d.rand === ales) ? ales : depozite[0].rand);
  // Lista poate veni reîmprospătată înaintea răspunsului, fără depozitul ales.
  const dep = depozite.find((d) => d.rand === rand) ?? depozite[0];
  const inMoneda = conturi.filter((c) => c.moneda === dep.moneda);
  const [dobanda, setDobanda] = useState<number | null>(dep.dobandaEstimata || null);
  const [actiune, setActiune] = useState<"prelungeste" | "lichideaza">("prelungeste");
  const [rata, setRata] = useState<number | null>(Math.round(dep.dobanda * 10000) / 100);
  const [luni, setLuni] = useState(dep.luni ?? 3);
  const [capitalizeaza, setCapitalizeaza] = useState(true);
  const [contAles, setContAles] = useState<number | null>(inMoneda.find((c) => c.lichiditate === "Imediat")?.rand ?? inMoneda[0]?.rand ?? null);
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();

  const alege = (r: number) => {
    const d = depozite.find((x) => x.rand === r)!;
    setRand(r); setDobanda(d.dobandaEstimata || null); setRata(Math.round(d.dobanda * 10000) / 100); setLuni(d.luni ?? 3);
    const lista = conturi.filter((c) => c.moneda === d.moneda);
    setContAles(lista.find((c) => c.lichiditate === "Imediat")?.rand ?? lista[0]?.rand ?? null);
    setStare({});
  };
  const ok = actiune === "prelungeste" ? (capitalizeaza || contAles != null) : contAles != null;
  const optiuni = (
    <select value={contAles ?? ""} onChange={(e) => setContAles(Number(e.target.value) || null)} className="camp mt-1">
      {inMoneda.length === 0 && <option value="">niciun cont în {dep.moneda}</option>}
      {inMoneda.map((c) => <option key={c.rand} value={c.rand}>{c.eticheta}</option>)}
    </select>
  );

  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      porneste(async () => {
        const r = await scadenta({
          rand: dep.rand, dobanda: dobanda ?? 0, actiune, rataNoua: rata ?? 0, luni, capitalizeaza, contDobanda: contAles, contLichidare: contAles,
        });
        if (r.mesaj) laSucces(r.mesaj);
        else setStare(r);
      });
    }}>
      <section className="card space-y-3 p-4">
        <label className="block">
          <span className="eticheta">Depozitul</span>
          <select value={dep.rand} onChange={(e) => alege(Number(e.target.value))} className="camp mt-1">
            {depozite.map((d) => (
              <option key={d.rand} value={d.rand}>
                {d.eticheta} · {d.zileRamase == null ? "fără scadență" : d.zileRamase < 0 ? `scadent de ${-d.zileRamase} zile` : d.zileRamase === 0 ? "scadent azi" : `în ${d.zileRamase} zile`}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-[var(--color-creion)]">
          <span className="cifre">{lei(dep.sold).replace(" lei", ` ${dep.moneda}`)}</span> · {(dep.dobanda * 100).toFixed(2)}%
          {dep.scadenta && <> · scadență {ziLunga(dep.scadenta)}</>}
        </p>
        <label className="block">
          <span className="eticheta">Dobânda netă primită</span>
          <CampSuma valoare={dobanda} onValoare={setDobanda} className="camp cifre mt-1" />
          <span className="mt-1 block text-xs text-[var(--color-creion)]">
            {dep.estimataSigur ? "Estimată din data constituirii — corecteaz-o cu suma din aplicația băncii." : "Estimare aproximativă — scrie suma din aplicația băncii."}
          </span>
        </label>
      </section>

      <section className={`card space-y-3 p-4 ${actiune === "prelungeste" ? "ring-2 ring-[var(--color-smalt-viu)]" : ""}`}>
        <label className="flex min-h-[2.75rem] items-center gap-3 font-semibold">
          <input type="radio" name="actiune" checked={actiune === "prelungeste"} onChange={() => setActiune("prelungeste")} className="size-5 accent-[var(--color-smalt)]" />
          Prelungește
        </label>
        {actiune === "prelungeste" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="eticheta">Dobândă nouă %</span><CampSuma valoare={rata} onValoare={setRata} className="camp cifre mt-1" /></label>
              <label><span className="eticheta">Termen</span>
                <select value={luni} onChange={(e) => setLuni(Number(e.target.value))} className="camp mt-1">
                  {[1, 3, 6, 12, 24].map((l) => <option key={l} value={l}>{l} {l === 1 ? "lună" : "luni"}</option>)}
                </select>
              </label>
            </div>
            <label className="flex min-h-[2.75rem] items-center gap-3">
              <input type="checkbox" checked={capitalizeaza} onChange={(e) => setCapitalizeaza(e.target.checked)} className="size-5 accent-[var(--color-smalt)]" />
              Dobânda rămâne în depozit
            </label>
            {!capitalizeaza && <label className="block"><span className="eticheta">Dobânda merge în</span>{optiuni}</label>}
          </>
        )}
      </section>

      <section className={`card space-y-3 p-4 ${actiune === "lichideaza" ? "ring-2 ring-[var(--color-smalt-viu)]" : ""}`}>
        <label className="flex min-h-[2.75rem] items-center gap-3 font-semibold">
          <input type="radio" name="actiune" checked={actiune === "lichideaza"} onChange={() => setActiune("lichideaza")} className="size-5 accent-[var(--color-smalt)]" />
          Lichidează
        </label>
        {actiune === "lichideaza" && <label className="block"><span className="eticheta">Banii, cu dobânda, merg în</span>{optiuni}</label>}
      </section>

      <Raspuns stare={stare} />
      <button type="submit" className="buton buton-principal w-full" disabled={!ok || seTrimite}>
        {seTrimite ? "Se notează…" : actiune === "prelungeste" ? "Prelungește" : "Lichidează"}
      </button>
    </form>
  );
}
