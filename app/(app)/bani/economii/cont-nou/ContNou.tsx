"use client";

import { useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";
import { lei } from "@/lib/formatare";
import { TIPURI_CONT_NOU, type ContPeEcran } from "@/lib/servicii/model-buget";

import { deschideCont } from "../actiuni";

/*
  Un fond = conturile lui. Contul de economii n-are termen și poate porni gol;
  depozitul și titlurile de stat au termen, scadență și dobânda estimată.
*/

const TERMENE = [1, 3, 6, 12, 24, 36];

export default function ContNou({
  azi, scopuri, scop: scopInitial, surse, titulari, monede, impozit, randuriLibere,
}: {
  azi: string; scopuri: string[]; scop: string | null; surse: ContPeEcran[]; titulari: string[]; monede: string[];
  impozit: number; randuriLibere: number;
}) {
  const [tip, setTip] = useState<(typeof TIPURI_CONT_NOU)[number]>("Cont de economii");
  const [institutie, setInstitutie] = useState("");
  const [produs, setProdus] = useState(scopInitial ?? "");
  const [suma, setSuma] = useState<number | null>(null);
  const [sursa, setSursa] = useState("venit");
  const [moneda, setMoneda] = useState("RON");
  const [dobanda, setDobanda] = useState<number | null>(null);
  const [luni, setLuni] = useState(3);
  const [data, setData] = useState(azi);
  const [scop, setScop] = useState(scopInitial && scopuri.includes(scopInitial) ? scopInitial : scopuri[0] ?? "Nealocat");
  const [titular, setTitular] = useState("Comun");
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();

  const cuScadenta = tip !== "Cont de economii";
  const src = surse.find((c) => String(c.rand) === sursa);
  const monedaReala = src ? src.moneda : moneda;
  const net = tip === "Titluri de stat" ? 1 : 1 - impozit;
  const s = suma ?? 0, r = (dobanda ?? 0) / 100;
  const estimare = r > 0 && s > 0
    ? cuScadenta ? `Dobândă estimată ≈ ${lei(s * r * (luni / 12) * net).replace(" lei", ` ${monedaReala}`)} net${tip === "Titluri de stat" ? " (fără impozit)" : ""}`
      : `Dobândă ≈ ${lei(s * r * net).replace(" lei", ` ${monedaReala}`)} net pe an la soldul ăsta`
    : null;
  const preaMult = src && s > src.sold + 0.001;
  const ok = institutie.trim() && (cuScadenta ? s > 0 : s >= 0) && !preaMult && randuriLibere > 0;

  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => {
      e.preventDefault();
      porneste(async () => {
        const rez = await deschideCont({ tip, institutie, produs: tip === "Depozit" ? "" : produs, moneda: monedaReala, suma: s,
          sursa: sursa === "venit" ? null : sursa, dobanda: dobanda ?? 0, luni: cuScadenta ? luni : null, data, scop, titular });
        setStare(rez);
        if (rez.mesaj) { setSuma(null); setProdus(""); }
      });
    }}>
      <div className="flex gap-2" role="radiogroup" aria-label="Ce deschizi">
        {TIPURI_CONT_NOU.map((t) => (
          <button key={t} type="button" role="radio" aria-checked={tip === t} onClick={() => setTip(t)}
            className={`buton buton-mic flex-1 ${tip === t ? "buton-principal" : "buton-secundar"}`}>
            {t === "Cont de economii" ? "Cont" : t === "Titluri de stat" ? "Titluri" : t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="eticheta">Banca</span>
          <input value={institutie} onChange={(e) => setInstitutie(e.target.value)} className="camp mt-1" placeholder="BT, ING…" required />
        </label>
        {tip !== "Depozit" ? (
          <label>
            <span className="eticheta">Numele</span>
            <input value={produs} onChange={(e) => setProdus(e.target.value)} className="camp mt-1"
              placeholder={tip === "Titluri de stat" ? "Fidelis 2027" : "Nunți"} />
          </label>
        ) : <span />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="eticheta">{cuScadenta ? "Suma" : "Suma inițială"}</span>
          <CampSuma valoare={suma} onValoare={setSuma} className="camp cifre mt-1" placeholder={cuScadenta ? "0,00" : "poate fi 0"} />
        </label>
        <label>
          <span className="eticheta">Moneda</span>
          <select value={monedaReala} disabled={!!src} onChange={(e) => setMoneda(e.target.value)} className="camp mt-1">
            {monede.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
      </div>

      {(s > 0 || cuScadenta) && (
        <label className="block">
          <span className="eticheta">Banii vin din</span>
          <select value={sursa} onChange={(e) => setSursa(e.target.value)} className="camp mt-1">
            <option value="venit">Bani noi din venitul lunii</option>
            {surse.map((c) => <option key={c.rand} value={c.rand}>{c.eticheta} — {lei(c.sold).replace(" lei", ` ${c.moneda}`)}</option>)}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="eticheta">Dobândă brută %/an</span>
          <CampSuma valoare={dobanda} onValoare={setDobanda} className="camp cifre mt-1" placeholder="6,5" />
        </label>
        {cuScadenta ? (
          <label>
            <span className="eticheta">Termen</span>
            <select value={luni} onChange={(e) => setLuni(Number(e.target.value))} className="camp mt-1">
              {TERMENE.map((l) => <option key={l} value={l}>{l} {l === 1 ? "lună" : "luni"}</option>)}
            </select>
          </label>
        ) : <span />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="eticheta">{cuScadenta ? "Constituit la" : "Deschis la"}</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="camp mt-1" />
        </label>
        <label>
          <span className="eticheta">Titular</span>
          <select value={titular} onChange={(e) => setTitular(e.target.value)} className="camp mt-1">
            {titulari.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="eticheta">Pentru fondul</span>
        <select value={scop} onChange={(e) => setScop(e.target.value)} className="camp mt-1">
          {scopuri.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>

      {estimare && <p className="text-sm text-[var(--color-creion)]">{estimare}</p>}
      {preaMult && <p className="text-sm text-[#8c3626]">Mai mult decât soldul contului ({lei(src!.sold)}).</p>}
      {randuriLibere === 0 && <p className="text-sm text-[#8c3626]">Tabelul de conturi din foaie e plin (rândurile 13–42). Închide întâi un cont.</p>}
      <Raspuns stare={stare} />
      <button type="submit" className="buton buton-principal w-full" disabled={!ok || seTrimite}>
        {seTrimite ? "Se deschide…" : "Deschide"}
      </button>
    </form>
  );
}
