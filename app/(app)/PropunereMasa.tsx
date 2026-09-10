"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { PropunereMeniu } from "@/lib/domeniu";
import { cuDe } from "@/lib/formatare";

import { pune } from "./mese/actiuni";

/*
  „Ce gătim azi”, pe ecranul de dimineață.

  Motivul e scris mai mare decât de obicei pentru un rând secundar, pentru că el
  e propunerea de fapt. „Sarmale” nu spune nimic; „folosește smântâna, expiră
  mâine” spune tot.
*/

export default function PropunereMasa({
  propunere,
  ziua,
}: {
  propunere: PropunereMeniu;
  ziua: string;
}) {
  const [pusa, setPusa] = useState(false);
  const [lucreaza, porneste] = useTransition();

  const { reteta, motiv } = propunere;

  return (
    <section className="card p-4">
      <span className="eticheta">Diseară</span>
      <p className="titlu mt-1 text-xl">
        <Link href={`/mese/retete/${reteta.id}`}>{reteta.titlu}</Link>
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-creion)]">
        {motiv}
        {reteta.minuteTotal ? ` · ${cuDe(reteta.minuteTotal, "minute")}` : ""}
        {reteta.laTm6 ? " · Thermomix" : ""}
      </p>

      {pusa ? (
        <p className="mt-3 text-sm text-[var(--color-smalt-adanc)]">
          Am pus-o în plan pentru diseară.
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <Link href="/mese" className="buton buton-secundar buton-mic flex-1">
            Altceva
          </Link>
          <button
            type="button"
            className="buton buton-principal buton-mic flex-1"
            disabled={lucreaza}
            onClick={() =>
              porneste(async () => {
                await pune(ziua, "cina", reteta.id);
                setPusa(true);
              })
            }
          >
            Asta facem
          </button>
        </div>
      )}
    </section>
  );
}
