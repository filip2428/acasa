"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { azi } from "@/lib/formatare";

import { adaugaCheltuiala, type StareCheltuiala } from "./actiuni";

/*
  Adăugarea unei cheltuieli, pe orice categorie din buget.

  Ordinea câmpurilor e cea în care ți-o amintești: întâi cât, apoi pe ce. Data e
  azi, pentru că aproape întotdeauna e azi, dar se schimbă cu un tap.

  Categoriile vin din foaia lunii curente, nu dintr-o listă a noastră: alea sunt
  cele pe care le adună formulele. Dacă adăugați o categorie în foaie, apare aici
  fără să schimbăm nimic în aplicație.
*/

export default function FormularCheltuiala({
  categorii,
  ultimaCategorie,
}: {
  categorii: string[];
  ultimaCategorie: string | null;
}) {
  const [stare, actiune] = useActionState<StareCheltuiala, FormData>(adaugaCheltuiala, {});
  const [categorie, setCategorie] = useState(ultimaCategorie ?? "");
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stare.mesaj) formular.current?.reset();
  }, [stare.mesaj]);

  // Cele mai folosite, la un tap distanță; restul rămân în listă.
  const rapide = ["Mâncare", "Mâncare în oraș", "Transport", "Igiena", "Curatenie"].filter((c) =>
    categorii.includes(c),
  );

  return (
    <form ref={formular} action={actiune} className="card space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="eticheta">Cât</span>
          <input
            name="suma"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            placeholder="0,00"
            className="camp cifre mt-1 text-lg"
            aria-describedby={stare.eroare ? "raspuns-cheltuiala" : undefined}
          />
        </label>

        <label>
          <span className="eticheta">Când</span>
          <input name="data" type="date" defaultValue={azi()} required className="camp mt-1" />
        </label>
      </div>

      <div>
        <span className="eticheta">Pe ce</span>
        {rapide.length > 0 && (
          <div className="mt-1.5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {rapide.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                aria-pressed={categorie === c}
                className={`buton buton-mic shrink-0 ${
                  categorie === c ? "buton-principal" : "buton-secundar"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <select
          name="categorie"
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          required
          className="camp mt-2"
          aria-label="Categoria din buget"
        >
          <option value="">alege categoria…</option>
          {categorii.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <label className="block">
        <span className="eticheta">Ce anume (opțional)</span>
        <input
          name="descriere"
          className="camp mt-1"
          placeholder="Lidl, plin Volvo, tenis…"
          autoComplete="off"
        />
      </label>

      {(stare.mesaj || stare.eroare || stare.avertisment) && (
        <div id="raspuns-cheltuiala" role="status" className="space-y-2">
          {stare.mesaj && (
            <p className="rounded-xl bg-[var(--color-smalt-palid)] px-3 py-2 text-sm text-[var(--color-smalt-adanc)]">
              {stare.mesaj}
            </p>
          )}
          {stare.avertisment && (
            <p className="rounded-xl bg-[var(--color-alama-palid)] px-3 py-2 text-sm text-[#7a5626]">
              {stare.avertisment}
            </p>
          )}
          {stare.eroare && (
            <p className="rounded-xl bg-[var(--color-caramida-palid)] px-3 py-2 text-sm text-[#8c3626]">
              {stare.eroare}
            </p>
          )}
        </div>
      )}

      <Buton />
    </form>
  );
}

function Buton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="buton buton-principal w-full" disabled={pending}>
      {pending ? "Se trece în buget…" : "Trece în buget"}
    </button>
  );
}
