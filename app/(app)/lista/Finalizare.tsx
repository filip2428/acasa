"use client";

import { useState, useTransition } from "react";

import { lei } from "@/lib/formatare";

import { finalizeazaLista, golesteBifate } from "./actiuni";

/*
  Închiderea listei, la ieșirea din magazin.

  Cerem totalul de pe bon pentru că e singurul număr sigur: estimările noastre
  sunt din prețuri vechi. Din el iese diferența față de estimare, iar prețurile
  bifate intră în istoric.
*/

export default function Finalizare({ total, deBifat }: { total: number; deBifat: number }) {
  const [deschis, setDeschis] = useState(false);
  const [totalReal, setTotalReal] = useState("");
  const [seTrimite, porneste] = useTransition();

  if (!deschis) {
    return (
      <div className="flex gap-2 pt-2 pb-4">
        <button
          type="button"
          className="buton buton-secundar flex-1"
          onClick={() => porneste(() => golesteBifate())}
        >
          Șterge bifatele
        </button>
        <button
          type="button"
          className="buton buton-principal flex-1"
          onClick={() => setDeschis(true)}
        >
          Am terminat
        </button>
      </div>
    );
  }

  return (
    <section className="card intra space-y-3 p-4">
      <h2 className="titlu text-lg">Închidem lista</h2>

      {deBifat > 0 && (
        <p className="text-sm text-[var(--color-creion)]">
          {deBifat === 1
            ? "Un articol rămâne nebifat și trece pe lista următoare."
            : `${deBifat} articole rămân nebifate și trec pe lista următoare.`}
        </p>
      )}

      <label className="block">
        <span className="eticheta">Totalul de pe bon</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={totalReal}
          onChange={(e) => setTotalReal(e.target.value)}
          placeholder={total > 0 ? lei(total).replace(" lei", "") : "0,00"}
          className="camp cifre mt-1.5"
        />
      </label>

      <p className="text-xs text-[var(--color-creion)]">
        Estimarea noastră a fost {lei(total)}. Prețurile bifate intră în istoric.
      </p>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="buton buton-secundar flex-1"
          onClick={() => setDeschis(false)}
        >
          Înapoi
        </button>
        <button
          type="button"
          className="buton buton-principal flex-1"
          disabled={seTrimite}
          onClick={() =>
            porneste(async () => {
              await finalizeazaLista(totalReal === "" ? null : Number(totalReal));
              setDeschis(false);
              setTotalReal("");
            })
          }
        >
          {seTrimite ? "Se salvează…" : "Închide lista"}
        </button>
      </div>
    </section>
  );
}
