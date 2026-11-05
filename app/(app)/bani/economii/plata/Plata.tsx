"use client";

import { useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";
import { lei } from "@/lib/formatare";
import { scopDinFinantare, type ContPeEcran } from "@/lib/servicii/model-buget";

import { platesteDinEconomii } from "../actiuni";

export default function Plata({ azi, categorii, surse, conturi }: { azi: string; categorii: string[]; surse: string[]; conturi: ContPeEcran[] }) {
  const implicit = (finantare: string) => {
    const scop = scopDinFinantare(finantare);
    const cu = conturi.filter((c) => c.scop === scop);
    return (cu.find((c) => c.lichiditate === "Imediat") ?? cu[0])?.rand ?? null;
  };
  const [suma, setSuma] = useState<number | null>(null);
  const [data, setData] = useState(azi);
  const [categorie, setCategorie] = useState("");
  const [descriere, setDescriere] = useState("");
  const [finantare, setFinantare] = useState(surse[0] ?? "");
  const [cont, setCont] = useState<number | null>(implicit(surse[0] ?? ""));
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();
  const c = conturi.find((x) => x.rand === cont);
  const preaMult = c && (suma ?? 0) / (c.moneda === "RON" ? 1 : c.curs || 1) > c.sold + 0.001;

  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => {
      e.preventDefault();
      porneste(async () => {
        const r = await platesteDinEconomii({ data, categorie, suma: suma ?? 0, descriere, finantare, cont });
        setStare(r);
        if (r.mesaj) { setSuma(null); setDescriere(""); }
      });
    }}>
      <div className="grid grid-cols-2 gap-3">
        <label><span className="eticheta">Cât</span>
          <CampSuma valoare={suma} onValoare={setSuma} className="camp cifre mt-1 text-lg" placeholder="0,00" required /></label>
        <label><span className="eticheta">Când</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="camp mt-1" required /></label>
      </div>
      <label className="block"><span className="eticheta">Pe ce</span>
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="camp mt-1" required>
          <option value="">alege categoria…</option>
          {categorii.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="block"><span className="eticheta">Ce anume (opțional)</span>
        <input value={descriere} onChange={(e) => setDescriere(e.target.value)} className="camp mt-1" placeholder="iPad, RCA, reparație…" />
      </label>
      <label className="block"><span className="eticheta">Plătit din</span>
        <select value={finantare} onChange={(e) => { setFinantare(e.target.value); setCont(implicit(e.target.value)); }} className="camp mt-1">
          {surse.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="block"><span className="eticheta">Banii ies din contul</span>
        <select value={cont ?? ""} onChange={(e) => setCont(e.target.value ? Number(e.target.value) : null)} className="camp mt-1">
          <option value="">— nu scad din niciun cont —</option>
          {conturi.map((x) => <option key={x.rand} value={x.rand}>{x.eticheta}{x.scop ? ` (${x.scop})` : ""} — {lei(x.sold).replace(" lei", ` ${x.moneda}`)}</option>)}
        </select>
      </label>
      {preaMult && <p className="text-sm text-[#8c3626]">Mai mult decât soldul contului.</p>}
      <p className="text-xs text-[var(--color-creion)]">Nu intră în bugetul lunii: apare separat, la „plătit din economii”.</p>
      <Raspuns stare={stare} />
      <button type="submit" className="buton buton-principal w-full" disabled={seTrimite || !(suma && suma > 0) || !categorie || !finantare || !!preaMult}>
        {seTrimite ? "Se notează…" : "Plătește din economii"}
      </button>
    </form>
  );
}
