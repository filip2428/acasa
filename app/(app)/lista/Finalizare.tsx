"use client";

import { useState, useTransition } from "react";

import { citesteSuma, lei } from "@/lib/formatare";

import { finalizeazaLista, golesteBifate } from "./actiuni";

/*
  Închiderea listei, la ieșirea din magazin.

  Cerem totalul de pe bon pentru că e singurul număr sigur: estimările noastre
  sunt din prețuri vechi. Din el iese diferența față de estimare, iar prețurile
  bifate intră în istoric.
*/

export default function Finalizare({
  total,
  deBifat,
  areBuget,
}: {
  total: number;
  deBifat: number;
  areBuget: boolean;
}) {
  const [deschis, setDeschis] = useState(false);
  const [totalReal, setTotalReal] = useState("");
  const [inBuget, setInBuget] = useState(true);
  const [raspuns, setRaspuns] = useState<string | null>(null);
  const [seTrimite, porneste] = useTransition();

  if (raspuns) {
    return (
      <section className="card intra space-y-3 p-4">
        <h2 className="titlu text-lg">Gata</h2>
        <p className="text-[0.9375rem] leading-relaxed">{raspuns}</p>
        <button
          type="button"
          className="buton buton-secundar w-full"
          onClick={() => setRaspuns(null)}
        >
          Am înțeles
        </button>
      </section>
    );
  }

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
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={totalReal}
          onChange={(e) => setTotalReal(e.target.value)}
          placeholder={total > 0 ? lei(total).replace(" lei", "") : "0,00"}
          className="camp cifre mt-1.5"
        />
      </label>

      <p className="text-xs text-[var(--color-creion)]">
        Estimarea noastră a fost {lei(total)}. Prețurile bifate intră în istoric.
      </p>

      {areBuget && (
        <label className="flex items-start gap-3 border-t border-[var(--color-linie)] pt-3">
          <input
            type="checkbox"
            checked={inBuget}
            onChange={(e) => setInBuget(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-smalt)]"
          />
          <span className="text-sm leading-snug">
            Trece în buget
            <span className="block text-xs text-[var(--color-creion)]">
              Împărțit pe categorii — mâncarea la Mâncare, detergentul la Curatenie. Dacă
              scrii totalul de pe bon, se împarte exact suma aia.
            </span>
          </span>
        </label>
      )}

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
              const rezultat = await finalizeazaLista(
                citesteSuma(totalReal),
                inBuget,
              );
              setDeschis(false);
              setTotalReal("");
              setRaspuns(rezultat ?? "Lista e închisă. Prețurile au intrat în istoric.");
            })
          }
        >
          {seTrimite ? "Se salvează…" : "Închide lista"}
        </button>
      </div>
    </section>
  );
}
