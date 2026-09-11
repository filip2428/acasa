"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DateReteta } from "@/lib/domeniu";
import { ETICHETE_NUTRITIE } from "@/lib/servicii/socoteli-ciclu";

import { salveaza } from "../actiuni";

/*
  Fișa unei rețete — capul ei, fără ingrediente.

  Ingredientele se adaugă pe ecranul rețetei, unul câte unul, cu catalogul la
  îndemână. Aici cerem doar atât cât să existe rețeta: cum se cheamă, pentru câți
  și cât durează. Restul se poate completa oricând.
*/

const EFORTURI: [valoare: string, eticheta: string][] = [
  ["usor", "Ușor"],
  ["mediu", "Mediu"],
  ["greu", "Cu treabă"],
];

export function retetaNoua(): DateReteta {
  return {
    titlu: "",
    portii: 2,
    minuteTotal: 30,
    laTm6: false,
    efort: "mediu",
    url: null,
    instructiuni: null,
    etichete: [],
  };
}

export default function FisaReteta({
  date: initiale,
  laInchidere,
  mergiLaEa = false,
}: {
  date: DateReteta;
  laInchidere: () => void;
  /** După ce se salvează o rețetă nouă, deschidem chiar ecranul ei. */
  mergiLaEa?: boolean;
}) {
  const [date, setDate] = useState(initiale);
  const [seSalveaza, porneste] = useTransition();
  const router = useRouter();

  const schimba = <C extends keyof DateReteta>(camp: C, valoare: DateReteta[C]) =>
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

        <label className="block">
          <span className="eticheta">Cum se cheamă</span>
          <input
            value={date.titlu}
            onChange={(e) => schimba("titlu", e.target.value)}
            className="camp mt-1"
            placeholder="Ciorbă de burtă"
            autoFocus={!date.id}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label>
            <span className="eticheta">Pentru câți</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="20"
              value={date.portii}
              onChange={(e) => schimba("portii", Number(e.target.value))}
              className="camp cifre mt-1"
            />
          </label>

          <label>
            <span className="eticheta">Minute</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="600"
              value={date.minuteTotal ?? ""}
              onChange={(e) =>
                schimba("minuteTotal", e.target.value ? Number(e.target.value) : null)
              }
              className="camp cifre mt-1"
            />
          </label>
        </div>

        <fieldset className="mt-3">
          <legend className="eticheta">Cât de mult de lucru</legend>
          <div className="mt-1.5 flex gap-2">
            {EFORTURI.map(([valoare, eticheta]) => (
              <button
                key={valoare}
                type="button"
                onClick={() => schimba("efort", valoare)}
                aria-pressed={date.efort === valoare}
                className={`buton buton-mic flex-1 ${
                  date.efort === valoare ? "buton-principal" : "buton-secundar"
                }`}
              >
                {eticheta}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-3 flex items-center gap-3">
          <input
            type="checkbox"
            checked={date.laTm6}
            onChange={(e) => schimba("laTm6", e.target.checked)}
            className="size-5 shrink-0 accent-[var(--color-smalt)]"
          />
          <span className="text-[0.9375rem]">Se face la Thermomix</span>
        </label>

        <fieldset className="mt-3">
          <legend className="eticheta">Ce aduce</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {ETICHETE_NUTRITIE.map((e) => {
              const are = date.etichete.includes(e.valoare);
              return (
                <button
                  key={e.valoare}
                  type="button"
                  aria-pressed={are}
                  onClick={() =>
                    schimba(
                      "etichete",
                      are ? date.etichete.filter((x) => x !== e.valoare) : [...date.etichete, e.valoare],
                    )
                  }
                  className={`buton buton-mic ${are ? "buton-principal" : "buton-secundar"}`}
                >
                  {e.eticheta}
                </button>
              );
            })}
          </div>
          <span className="mt-1 block text-xs leading-relaxed text-[var(--color-creion)]">
            Urcă în propuneri în fazele ciclului în care prind bine.
          </span>
        </fieldset>

        <label className="mt-3 block">
          <span className="eticheta">Link (Cookidoo sau oriunde)</span>
          <input
            value={date.url ?? ""}
            onChange={(e) => schimba("url", e.target.value || null)}
            className="camp mt-1"
            type="url"
            inputMode="url"
            placeholder="https://cookidoo.ro/recipes/…"
          />
          <span className="mt-1 block text-xs leading-relaxed text-[var(--color-creion)]">
            Pașii rămân acolo unde sunt — mai ales la Cookidoo, de unde oricum
            gătești de pe Thermomix. Aici ținem doar ce trebuie ca să știm dacă o
            poți găti azi.
          </span>
        </label>

        <label className="mt-3 block">
          <span className="eticheta">Cum se face (opțional)</span>
          <textarea
            value={date.instructiuni ?? ""}
            onChange={(e) => schimba("instructiuni", e.target.value || null)}
            className="camp mt-1 min-h-24"
            placeholder="Pentru rețetele care nu stau nicăieri altundeva."
          />
        </label>

        <div className="mt-5 flex gap-2">
          <button type="button" className="buton buton-secundar flex-1" onClick={laInchidere}>
            Renunță
          </button>
          <button
            type="button"
            className="buton buton-principal flex-1"
            disabled={seSalveaza || date.titlu.trim() === ""}
            onClick={() =>
              porneste(async () => {
                const id = await salveaza(date);
                laInchidere();
                if (mergiLaEa && id) router.push(`/mese/retete/${id}`);
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
