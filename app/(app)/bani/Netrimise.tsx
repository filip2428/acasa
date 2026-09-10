"use client";

import { useState, useTransition } from "react";

import { reincearca } from "./actiuni";

/*
  Cheltuielile care n-au apucat să ajungă în foaie — de obicei pentru că n-a fost
  semnal. Sunt salvate în aplicație și pleacă la o singură apăsare.
*/

export default function Netrimise({ cate }: { cate: number }) {
  const [seTrimite, porneste] = useTransition();
  const [raspuns, setRaspuns] = useState<string | null>(null);

  return (
    <section className="card p-4">
      <h2 className="titlu text-lg">
        {cate === 1 ? "O cheltuială n-a ajuns în foaie" : `${cate} cheltuieli n-au ajuns în foaie`}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-creion)]">
        Sunt salvate aici și nu se pierd. Încearcă din nou când ai semnal.
      </p>

      {raspuns && <p className="mt-2 text-sm">{raspuns}</p>}

      <button
        type="button"
        className="buton buton-secundar mt-3 w-full"
        disabled={seTrimite}
        onClick={() =>
          porneste(async () => {
            const rezultat = await reincearca();
            setRaspuns(
              rezultat.eroare
                ? `Tot nu merge: ${rezultat.eroare}`
                : `S-au trimis ${rezultat.cate}.`,
            );
          })
        }
      >
        {seTrimite ? "Se trimit…" : "Trimite acum"}
      </button>
    </section>
  );
}
