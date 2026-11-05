"use client";

import { useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";
import { lei } from "@/lib/formatare";
import type { ContPeEcran } from "@/lib/servicii/model-buget";

import { mutaBani } from "../actiuni";

/*
  Mută bani între două conturi — și între fonduri, pentru că un fond e contul
  lui. În altă monedă, suma primită pleacă de la cursul din foaie; scrie-o pe
  cea reală (de ex. după schimbul din Revolut).
*/

export default function Muta({ conturi, din: dinInitial, spre: spreInitial }: { conturi: ContPeEcran[]; din: number | null; spre: number | null }) {
  const [din, setDin] = useState<number | null>(dinInitial ?? conturi[0]?.rand ?? null);
  const [spre, setSpre] = useState<number | null>(spreInitial ?? conturi.find((c) => c.rand !== (dinInitial ?? conturi[0]?.rand))?.rand ?? null);
  const [suma, setSuma] = useState<number | null>(null);
  const [primit, setPrimit] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();

  const a = conturi.find((c) => c.rand === din), b = conturi.find((c) => c.rand === spre);
  const alta = a && b && a.moneda !== b.moneda;
  const primitCalculat = alta && suma ? Math.round(((suma * (a!.curs || 1)) / (b!.curs || 1)) * 100) / 100 : null;
  const preaMult = a && suma != null && suma > a.sold + 0.001;
  const ok = a && b && a.rand !== b.rand && (suma ?? 0) > 0 && !preaMult;

  // Funcție, nu componentă: definită în render, o componentă s-ar remonta la fiecare tastă.
  const alegere = (valoare: number | null, setValoare: (v: number) => void, eticheta: string) => (
    <label className="block">
      <span className="eticheta">{eticheta}</span>
      <select value={valoare ?? ""} onChange={(e) => { setValoare(Number(e.target.value)); setPrimit(null); }} className="camp mt-1">
        {conturi.map((c) => <option key={c.rand} value={c.rand}>{c.eticheta} — {lei(c.sold).replace(" lei", ` ${c.moneda}`)}</option>)}
      </select>
    </label>
  );

  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => {
      e.preventDefault();
      porneste(async () => {
        const r = await mutaBani({ din: din!, spre: spre!, suma: suma ?? 0, primit: alta ? (primit ?? primitCalculat) : null, nota });
        setStare(r);
        if (r.mesaj) { setSuma(null); setPrimit(null); setNota(""); }
      });
    }}>
      {alegere(din, setDin, "Din contul")}
      {alegere(spre, setSpre, "În contul")}
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="eticheta">Suma {a ? `(${a.moneda})` : ""}</span>
          <CampSuma valoare={suma} onValoare={(v) => { setSuma(v); setPrimit(null); }} className="camp cifre mt-1 text-lg" placeholder="0,00" />
        </label>
        {alta && (
          <label>
            <span className="eticheta">Primit ({b!.moneda})</span>
            <CampSuma valoare={primit ?? primitCalculat} onValoare={setPrimit} className="camp cifre mt-1 text-lg" />
          </label>
        )}
      </div>
      {alta && suma && (primit ?? primitCalculat) ? (
        <p className="text-xs text-[var(--color-creion)]">Curs efectiv: <span className="cifre">{(suma / (primit ?? primitCalculat)!).toFixed(4)}</span> {a!.moneda}/{b!.moneda}</p>
      ) : null}
      {preaMult && <p className="text-sm text-[#8c3626]">Mai mult decât soldul contului ({lei(a!.sold)}).</p>}
      <label className="block">
        <span className="eticheta">Notă (opțional)</span>
        <input value={nota} onChange={(e) => setNota(e.target.value)} className="camp mt-1" placeholder="ex: alimentare XTB prin Revolut" />
      </label>
      <Raspuns stare={stare} />
      <button type="submit" className="buton buton-principal w-full" disabled={!ok || seTrimite}>
        {seTrimite ? "Se mută…" : "Mută"}
      </button>
    </form>
  );
}
