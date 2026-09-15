"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import AlegeCategoria from "@/componente/AlegeCategoria";
import CampSuma from "@/componente/CampSuma";
import type { Categorie } from "@/lib/db/schema";
import type { ProdusDinCatalog } from "@/lib/servicii/produse";

import { arhiveazaProdus, salveazaProdus } from "./actiuni";

export type Schita = {
  id?: number;
  nume: string;
  categorieId: number | null;
  unitate: string;
  cantitateImplicita: number;
  codBare: string | null;
  pozaUrl: string | null;
  pret: number | null;
  zileValabilitate: number | null;
};

const UNITATI = ["buc", "kg", "g", "l", "ml"];

export function schitaDin(produs: ProdusDinCatalog): Schita {
  return {
    id: produs.id,
    nume: produs.nume,
    categorieId: produs.categorieId,
    unitate: produs.unitate,
    cantitateImplicita: produs.cantitateImplicita,
    codBare: produs.codBare,
    pozaUrl: produs.pozaUrl,
    pret: produs.pretUltim,
    zileValabilitate: produs.zileValabilitate,
  };
}

/*
  Fișa unui produs, deschisă ca panou de jos — cum se deschid ecranele native pe
  telefon, cu degetul aproape de butoane.
*/

export default function FisaProdus({
  schita,
  categorii,
  laInchidere,
}: {
  schita: Schita;
  categorii: Categorie[];
  laInchidere: () => void;
}) {
  const [date, setDate] = useState(schita);
  const [seSalveaza, porneste] = useTransition();

  const schimba = <C extends keyof Schita>(camp: C, valoare: Schita[C]) =>
    setDate((d) => ({ ...d, [camp]: valoare }));

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Închide fișa"
        onClick={laInchidere}
        className="absolute inset-0 bg-black/35"
      />

      <section
        className="intra relative max-h-[90dvh] overflow-y-auto rounded-t-[1.5rem] bg-[var(--color-chit)] p-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-linie)]" />

        <div className="flex items-start gap-3">
          {date.pozaUrl ? (
            <Image
              src={date.pozaUrl}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="size-14 shrink-0 rounded-xl bg-white object-contain"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <label className="eticheta" htmlFor="nume-produs">
              Nume
            </label>
            <input
              id="nume-produs"
              value={date.nume}
              onChange={(e) => schimba("nume", e.target.value)}
              className="camp mt-1"
              placeholder="Lapte 3,5%"
              autoFocus={!date.id}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <span className="eticheta">Categorie</span>
            <div className="mt-1">
              <AlegeCategoria
                categorii={categorii}
                valoare={date.categorieId}
                onAlege={(id) => schimba("categorieId", id)}
              />
            </div>
          </div>

          <label>
            <span className="eticheta">Unitate</span>
            <select
              value={date.unitate}
              onChange={(e) => schimba("unitate", e.target.value)}
              className="camp mt-1"
            >
              {UNITATI.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="eticheta">Preț</span>
            <CampSuma
              valoare={date.pret}
              onValoare={(v) => schimba("pret", v)}
              className="camp cifre mt-1"
              placeholder="0,00"
            />
          </label>

          <label>
            <span className="eticheta">Cantitate obișnuită</span>
            <CampSuma
              valoare={date.cantitateImplicita}
              onValoare={(v) => v != null && schimba("cantitateImplicita", v)}
              className="camp cifre mt-1"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="eticheta">Ține în casă (zile)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={date.zileValabilitate ?? ""}
            onChange={(e) =>
              schimba("zileValabilitate", e.target.value === "" ? null : Number(e.target.value))
            }
            className="camp cifre mt-1"
            placeholder="7"
          />
          <span className="mt-1 block text-xs text-[var(--color-creion)]">
            Din asta propunem data de expirare când produsul intră în cămară.
          </span>
        </label>

        {date.codBare && (
          <p className="cifre mt-3 text-xs text-[var(--color-creion)]">
            Cod de bare {date.codBare}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          {date.id && (
            <button
              type="button"
              className="buton buton-secundar buton-sters"
              onClick={() =>
                porneste(async () => {
                  await arhiveazaProdus(date.id!);
                  laInchidere();
                })
              }
            >
              Scoate
            </button>
          )}
          <button type="button" className="buton buton-secundar flex-1" onClick={laInchidere}>
            Renunță
          </button>
          <button
            type="button"
            className="buton buton-principal flex-1"
            disabled={seSalveaza || date.nume.trim() === ""}
            onClick={() =>
              porneste(async () => {
                await salveazaProdus({
                  id: date.id,
                  nume: date.nume,
                  categorieId: date.categorieId,
                  unitate: date.unitate,
                  cantitateImplicita: date.cantitateImplicita,
                  codBare: date.codBare,
                  pozaUrl: date.pozaUrl,
                  pret: date.pret,
                  zileValabilitate: date.zileValabilitate,
                });
                laInchidere();
              })
            }
          >
            {seSalveaza ? "Se salvează…" : "Salvează"}
          </button>
        </div>
      </section>
    </div>
  );
}
