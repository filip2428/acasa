"use client";

import { useMemo, useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";
import { lei } from "@/lib/formatare";
import { GUILT_FREE, imparteVenit, INVESTITII, PERSOANE, procenteRegula, REGULI_OCAZIONAL, type Persoana, type Regula } from "@/lib/servicii/model-buget";

import { venitOcazional } from "../economii/actiuni";

/*
  Încasarea unui venit ocazional, ca în fereastra „💵” din foaie:
  - „Pentru” Filip sau Ralu → implicit tot la Guilt free-ul lui / ei;
  - regula se schimbă cu un tap, iar sumele se pot corecta de mână;
  - banii de fond pot ajunge acum în cont, sau rămân „de mutat”.
*/

const SURSE = ["Cadou", "Cadou familie", "Vânzare", "Chirie extra", "Bonus la job", "Altele"];
type Parti = { investitii: number | null; fond: number | null; guiltFreeFilip: number | null; guiltFreeRalu: number | null };

export default function Ocazional({ azi, fonduri, fondImplicit, contPeFond }: {
  azi: string; fonduri: string[]; fondImplicit: string; contPeFond: Record<string, string>;
}) {
  const [suma, setSuma] = useState<number | null>(null);
  const [sursa, setSursa] = useState(SURSE[0]);
  const [pentru, setPentru] = useState<Persoana>("Comun");
  const [descriere, setDescriere] = useState("");
  const [zeciuiala, setZeciuiala] = useState(true);
  const [regula, setRegula] = useState<Regula | "pers">("standard");
  const [fond, setFond] = useState(fondImplicit);
  const [manual, setManual] = useState<Parti | null>(null);
  const [mutaAcum, setMutaAcum] = useState(true);
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();

  const calculat = useMemo(() => {
    const p = imparteVenit(suma ?? 0, zeciuiala, procenteRegula(regula === "pers" ? "standard" : regula, pentru));
    return { zeciuiala: p.zeciuiala, rest: p.rest, investitii: p.investitii, fond: p.fond, guiltFreeFilip: p.guiltFreeFilip, guiltFreeRalu: p.guiltFreeRalu };
  }, [suma, zeciuiala, regula, pentru]);
  const parti: Parti = manual ?? calculat;
  const valori = [parti.investitii, parti.fond, parti.guiltFreeFilip, parti.guiltFreeRalu].map((x) => x ?? 0);
  const nealocat = Math.round(((suma ?? 0) - calculat.zeciuiala - valori.reduce((a, b) => a + b, 0)) * 100) / 100;
  const ok = (suma ?? 0) > 0 && Math.abs(nealocat) < 0.01 && valori.every((x) => x >= 0) && (!(parti.fond! > 0) || fond);

  const schimbaPentru = (p: Persoana) => { setPentru(p); setRegula(p === "Comun" ? "standard" : "guiltfree"); setManual(null); };
  const corecteaza = (k: keyof Parti, v: number | null) => { setRegula("pers"); setManual({ ...parti, [k]: v }); };

  const rand = (eticheta: string, k: keyof Parti, unde?: string) => (
    <div className="flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem]">{eticheta}</span>
        {unde && (parti[k] ?? 0) > 0 && <span className="block truncate text-xs text-[var(--color-creion)]">{unde}</span>}
      </span>
      {/* `.camp` are lățimea 100%: lățimea fixă o dă cutia din jur. */}
      <div className="w-32 shrink-0">
        <CampSuma valoare={parti[k]} onValoare={(v) => corecteaza(k, v)} aria-label={eticheta} className="camp cifre text-right" />
      </div>
    </div>
  );
  const unde = (f: string) => (mutaAcum ? (contPeFond[f] ? `→ ${contPeFond[f]}` : "fără cont — rămâne „de mutat”") : "rămâne „de mutat”");

  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      porneste(async () => {
        const r = await venitOcazional({
          data: azi, suma: suma ?? 0, sursa, descriere, pentru, zeciuiala,
          investitii: parti.investitii ?? 0, fond, sumaFond: parti.fond ?? 0,
          guiltFreeFilip: parti.guiltFreeFilip ?? 0, guiltFreeRalu: parti.guiltFreeRalu ?? 0, mutaAcum,
        });
        setStare(r);
        if (r.mesaj) { setSuma(null); setDescriere(""); setManual(null); }
      });
    }}>
      <section className="card space-y-3 p-4">
        <label className="block">
          <span className="eticheta">Cât a intrat</span>
          <CampSuma valoare={suma} onValoare={(v) => { setSuma(v); setManual(null); if (regula === "pers") setRegula(pentru === "Comun" ? "standard" : "guiltfree"); }}
            className="camp cifre mt-1 text-lg" placeholder="0,00" required />
        </label>
        <div>
          <span className="eticheta">Pentru</span>
          <div className="mt-1.5 flex gap-2">
            {PERSOANE.map((p) => (
              <button key={p} type="button" aria-pressed={pentru === p} onClick={() => schimbaPentru(p)}
                className={`buton buton-mic flex-1 ${pentru === p ? "buton-principal" : "buton-secundar"}`}>{p}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="eticheta">De unde</span>
            <select value={sursa} onChange={(e) => setSursa(e.target.value)} className="camp mt-1">{SURSE.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label><span className="eticheta">Ce anume</span>
            <input value={descriere} onChange={(e) => setDescriere(e.target.value)} className="camp mt-1" placeholder="de ziua Ralucăi" />
          </label>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <label className="flex min-h-[2.75rem] items-center gap-3">
          <input type="checkbox" checked={zeciuiala} onChange={(e) => { setZeciuiala(e.target.checked); setManual(null); }} className="size-5 accent-[var(--color-smalt)]" />
          <span className="flex-1">Zeciuială 10%</span>
          <span className="cifre">{lei(calculat.zeciuiala)}</span>
        </label>
        <label className="block">
          <span className="eticheta">Restul de {lei(calculat.rest)} se împarte</span>
          <select value={regula} onChange={(e) => { setRegula(e.target.value as Regula); setManual(null); }} className="camp mt-1">
            {REGULI_OCAZIONAL.map((r) => <option key={r.id} value={r.id}>{r.nume}</option>)}
            <option value="pers">Personalizat (sumele de mai jos)</option>
          </select>
        </label>
        <div className="space-y-2.5">
          {rand(INVESTITII, "investitii", unde(INVESTITII))}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <select value={fond} onChange={(e) => setFond(e.target.value)} className="camp" aria-label="Fondul">
                {fonduri.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="w-32 shrink-0">
              <CampSuma valoare={parti.fond} onValoare={(v) => corecteaza("fond", v)} aria-label="Suma pentru fond" className="camp cifre text-right" />
            </div>
          </div>
          {(parti.fond ?? 0) > 0 && <p className="-mt-1 text-xs text-[var(--color-creion)]">{unde(fond)}</p>}
          {rand(GUILT_FREE.Filip, "guiltFreeFilip")}
          {rand(GUILT_FREE.Ralu, "guiltFreeRalu")}
        </div>
        <p className={`text-sm font-semibold ${Math.abs(nealocat) < 0.01 ? "text-[var(--color-smalt)]" : "text-[#8c3626]"}`}>
          {(suma ?? 0) <= 0 ? "Scrie suma." : Math.abs(nealocat) < 0.01 ? "Totul e împărțit." : `Nealocat: ${lei(nealocat)}`}
        </p>
        <label className="flex min-h-[2.75rem] items-center gap-3 text-sm">
          <input type="checkbox" checked={mutaAcum} onChange={(e) => setMutaAcum(e.target.checked)} className="size-5 accent-[var(--color-smalt)]" />
          Mut acum banii de fond în conturi
        </label>
      </section>

      <Raspuns stare={stare} />
      <button type="submit" className="buton buton-principal w-full" disabled={!ok || seTrimite}>
        {seTrimite ? "Se înregistrează…" : "Înregistrează"}
      </button>
    </form>
  );
}
