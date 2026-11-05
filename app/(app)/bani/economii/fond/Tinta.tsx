"use client";

import { useState, useTransition } from "react";

import CampSuma from "@/componente/CampSuma";
import Raspuns, { type StareRaspuns } from "@/componente/Raspuns";

import { seteazaTinta } from "../actiuni";

/* Ținta și termenul unui fond, scrise în foaia Fonduri (coloanele Țintă și Până la). */

export default function Tinta({ nume, tinta: initiala, panaLa: initial }: { nume: string; tinta: number | null; panaLa: string | null }) {
  const [deschis, setDeschis] = useState(false);
  const [tinta, setTinta] = useState<number | null>(initiala);
  const [panaLa, setPanaLa] = useState(initial ?? "");
  const [stare, setStare] = useState<StareRaspuns>({});
  const [seTrimite, porneste] = useTransition();

  if (!deschis) {
    return (
      <button type="button" onClick={() => setDeschis(true)} className="buton buton-secundar buton-mic">
        {initiala != null ? "Schimbă ținta" : "Pune o țintă"}
      </button>
    );
  }
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      porneste(async () => { const r = await seteazaTinta({ nume, tinta, panaLa: panaLa || null }); setStare(r); if (r.mesaj) setDeschis(false); });
    }}>
      <div className="grid grid-cols-2 gap-3">
        <label><span className="eticheta">Țintă (lei)</span><CampSuma valoare={tinta} onValoare={setTinta} className="camp cifre mt-1" placeholder="3000" /></label>
        <label><span className="eticheta">Până la</span><input type="date" value={panaLa} onChange={(e) => setPanaLa(e.target.value)} className="camp mt-1" /></label>
      </div>
      <Raspuns stare={stare} />
      <div className="flex gap-2">
        <button type="submit" className="buton buton-principal flex-1" disabled={seTrimite}>{seTrimite ? "Se salvează…" : "Salvează"}</button>
        <button type="button" className="buton buton-secundar" onClick={() => setDeschis(false)}>Renunță</button>
      </div>
    </form>
  );
}
