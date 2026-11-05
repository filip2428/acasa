"use client";

import { useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";
import { lei } from "@/lib/formatare";
import type { ContPeEcran } from "@/lib/servicii/model-buget";

import { inchideCont } from "../actiuni";

/*
  Închide un cont sau vinde o investiție: banii rămași merg în alt cont (și în
  altă monedă) sau ies din economii. Rândul din foaie se golește, iar istoricul
  rămâne în Economii_Mișcări.
*/

export default function Inchide({ conturi, ales }: { conturi: ContPeEcran[]; ales: number | null }) {
  const [rand, setRand] = useState(ales && conturi.some((c) => c.rand === ales) ? ales : conturi[0]?.rand ?? null);
  const c = conturi.find((x) => x.rand === rand);
  const implicit = (x: ContPeEcran | undefined) =>
    conturi.find((d) => x && d.rand !== x.rand && !d.cuScadenta && d.moneda === x.moneda && d.lichiditate === "Imediat")?.rand ?? "afara";
  const [dest, setDest] = useState<number | "afara">(implicit(c));
  const [dobanda, setDobanda] = useState<number | null>(0);
  const [primit, setPrimit] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [confirmat, setConfirmat] = useState(false);
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();

  if (!c) return <p className="card p-4 text-[var(--color-creion)]">Nu ai conturi în foaia Economii.</p>;
  const d = dest === "afara" ? null : conturi.find((x) => x.rand === dest);
  const total = c.sold + (c.cuScadenta ? dobanda ?? 0 : 0);
  const alta = d && d.moneda !== c.moneda;
  const primitCalculat = alta ? Math.round(((total * (c.curs || 1)) / (d!.curs || 1)) * 100) / 100 : null;
  const castig = c.investitie && c.depus > 0 ? c.sold - c.depus : null;

  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => {
      e.preventDefault();
      porneste(async () => {
        const r = await inchideCont({ rand: c.rand, destinatie: dest, primit: alta ? primit ?? primitCalculat : null, dobanda: dobanda ?? 0, nota });
        setStare(r);
        setConfirmat(false);
      });
    }}>
      <label className="block">
        <span className="eticheta">Ce închizi</span>
        <select value={rand ?? ""} onChange={(e) => { const r = Number(e.target.value); setRand(r); setDest(implicit(conturi.find((x) => x.rand === r))); setPrimit(null); setStare({}); }} className="camp mt-1">
          {conturi.map((x) => <option key={x.rand} value={x.rand}>{x.eticheta} — {lei(x.sold).replace(" lei", ` ${x.moneda}`)}</option>)}
        </select>
      </label>
      <p className="text-sm text-[var(--color-creion)]">
        Sold <span className="cifre">{lei(c.sold).replace(" lei", ` ${c.moneda}`)}</span>
        {castig != null && <> · depus <span className="cifre">{lei(c.depus)}</span> · câștig <span className="cifre">{castig >= 0 ? "+" : ""}{lei(castig).replace(" lei", ` ${c.moneda}`)}</span></>}
        {c.investitie && " — actualizează întâi soldul cu valoarea exactă de la vânzare."}
      </p>
      {c.cuScadenta && (
        <label className="block">
          <span className="eticheta">Dobândă primită la închidere</span>
          <CampSuma valoare={dobanda} onValoare={setDobanda} className="camp cifre mt-1" />
          <span className="mt-1 block text-xs text-[var(--color-creion)]">Spart înainte de scadență, de obicei se pierde — lasă 0.</span>
        </label>
      )}
      <label className="block">
        <span className="eticheta">Banii rămași merg în</span>
        <select value={dest} onChange={(e) => { setDest(e.target.value === "afara" ? "afara" : Number(e.target.value)); setPrimit(null); }} className="camp mt-1">
          {conturi.filter((x) => x.rand !== c.rand && !x.cuScadenta).map((x) => <option key={x.rand} value={x.rand}>{x.eticheta}</option>)}
          <option value="afara">— ies din economii (cont curent / cheltuiți) —</option>
        </select>
      </label>
      {alta && total > 0 && (
        <label className="block">
          <span className="eticheta">Primit ({d!.moneda})</span>
          <CampSuma valoare={primit ?? primitCalculat} onValoare={setPrimit} className="camp cifre mt-1" />
        </label>
      )}
      <label className="block">
        <span className="eticheta">Notă (opțional)</span>
        <input value={nota} onChange={(e) => setNota(e.target.value)} className="camp mt-1" placeholder="ex: vândut pentru avans" />
      </label>
      <label className="flex min-h-[2.75rem] items-center gap-3 text-sm">
        <input type="checkbox" checked={confirmat} onChange={(e) => setConfirmat(e.target.checked)} className="size-5 accent-[var(--color-caramida)]" />
        Da, închid „{c.eticheta}”
      </label>
      <Raspuns stare={stare} />
      <button type="submit" className="buton buton-principal w-full" disabled={!confirmat || seTrimite}>
        {seTrimite ? "Se închide…" : "Închide contul"}
      </button>
    </form>
  );
}
