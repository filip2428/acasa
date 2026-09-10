"use client";

import { useState, useTransition } from "react";

import { azi, candFataDeAzi } from "@/lib/formatare";
import {
  CATEGORII_CALENDAR,
  type DateEveniment,
  type EvenimentAfisat,
} from "@/lib/domeniu";

import { bifeaza, salveaza, scoate } from "./actiuni";

/*
  Calendarul casei.

  Recurența se alege în luni, nu în zile, pentru că exact așa se vorbește despre
  lucrurile astea: ITP la doi ani, revizie la un an, detartraj la șase luni.
*/

const RECURENTE: [luni: number | null, eticheta: string][] = [
  [null, "o singură dată"],
  [1, "lunar"],
  [3, "la trei luni"],
  [6, "la șase luni"],
  [12, "anual"],
  [24, "la doi ani"],
  [60, "la cinci ani"],
];

function recurentaInCuvinte(luni: number | null) {
  return RECURENTE.find(([l]) => l === luni)?.[1] ?? `la ${luni} luni`;
}

const NOU: DateEveniment = {
  titlu: "",
  categorie: "masina",
  data: azi(),
  recurentaLuni: 12,
  remindereZileInainte: 14,
  notite: null,
};

export default function Calendar({ evenimente }: { evenimente: EvenimentAfisat[] }) {
  const [fisa, setFisa] = useState<DateEveniment | null>(null);
  const [, porneste] = useTransition();

  const peCategorii = CATEGORII_CALENDAR.map((c) => ({
    ...c,
    evenimente: evenimente.filter((e) => e.categorie === c.valoare),
  })).filter((g) => g.evenimente.length > 0);

  return (
    <>
      {evenimente.length === 0 ? (
        <p className="px-1 py-8 text-center text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
          Aici intră ITP-ul, RCA-ul, revizia centralei, controlul stomatologic,
          buletinul care expiră. Fiecare se socotește de la ultima dată când a fost
          făcut, nu de la o zi fixă din calendar.
        </p>
      ) : (
        peCategorii.map((grupa) => (
          <section key={grupa.valoare}>
            <h2 className="eticheta mb-1.5 px-1">{grupa.eticheta}</h2>
            <ul className="card card-lipit overflow-hidden">
              {grupa.evenimente.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setFisa({
                        id: e.id,
                        titlu: e.titlu,
                        categorie: e.categorie,
                        data: e.scadenta,
                        recurentaLuni: e.recurentaLuni,
                        remindereZileInainte: e.remindereZileInainte,
                        notite: e.notite,
                      })
                    }
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem]">{e.titlu}</span>
                      <span className="text-xs text-[var(--color-creion)]">
                        {e.scadenta ? candFataDeAzi(e.scadenta) : "fără dată"}
                        {e.recurentaLuni ? ` · ${recurentaInCuvinte(e.recurentaLuni)}` : ""}
                      </span>
                    </span>
                    {e.zilePanaLa != null && e.zilePanaLa < 0 && (
                      <span className="fisa fisa-caramida shrink-0">a trecut</span>
                    )}
                    {e.zilePanaLa != null &&
                      e.zilePanaLa >= 0 &&
                      e.zilePanaLa <= e.remindereZileInainte && (
                        <span className="fisa fisa-alama shrink-0">curând</span>
                      )}
                  </button>

                  {e.scadenta && (
                    <div className="px-3.5 pb-2.5">
                      <button
                        type="button"
                        className="buton buton-mic buton-secundar"
                        onClick={() => porneste(() => bifeaza(e.id))}
                      >
                        {e.recurentaLuni ? "Făcut azi" : "Gata, scoate-l"}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <button
        type="button"
        className="buton buton-principal w-full"
        onClick={() => setFisa(NOU)}
      >
        Adaugă în calendar
      </button>

      {fisa && <Fisa date={fisa} laInchidere={() => setFisa(null)} />}
    </>
  );
}

function Fisa({ date: initiale, laInchidere }: { date: DateEveniment; laInchidere: () => void }) {
  const [date, setDate] = useState(initiale);
  const [seSalveaza, porneste] = useTransition();

  const schimba = <C extends keyof DateEveniment>(camp: C, valoare: DateEveniment[C]) =>
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
          <span className="eticheta">Ce anume</span>
          <input
            value={date.titlu}
            onChange={(e) => schimba("titlu", e.target.value)}
            className="camp mt-1"
            placeholder="ITP Volvo"
            autoFocus={!date.id}
          />
        </label>

        <fieldset className="mt-3">
          <legend className="eticheta">Categorie</legend>
          <div className="-mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4 pb-1">
            {CATEGORII_CALENDAR.map((c) => (
              <button
                key={c.valoare}
                type="button"
                onClick={() => schimba("categorie", c.valoare)}
                aria-pressed={date.categorie === c.valoare}
                className={`buton buton-mic shrink-0 ${
                  date.categorie === c.valoare ? "buton-principal" : "buton-secundar"
                }`}
              >
                {c.eticheta}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label>
            <span className="eticheta">Când</span>
            <input
              type="date"
              value={date.data ?? ""}
              onChange={(e) => schimba("data", e.target.value || null)}
              className="camp mt-1"
            />
          </label>

          <label>
            <span className="eticheta">Se repetă</span>
            <select
              value={date.recurentaLuni ?? ""}
              onChange={(e) =>
                schimba("recurentaLuni", e.target.value ? Number(e.target.value) : null)
              }
              className="camp mt-1"
            >
              {RECURENTE.map(([luni, eticheta]) => (
                <option key={eticheta} value={luni ?? ""}>
                  {eticheta}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="eticheta">Anunță-mă cu</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="90"
              value={date.remindereZileInainte}
              onChange={(e) => schimba("remindereZileInainte", Number(e.target.value))}
              className="camp cifre w-24"
            />
            <span className="text-sm text-[var(--color-creion)]">zile înainte</span>
          </div>
        </label>

        <label className="mt-3 block">
          <span className="eticheta">Notițe (opțional)</span>
          <input
            value={date.notite ?? ""}
            onChange={(e) => schimba("notite", e.target.value || null)}
            className="camp mt-1"
            placeholder="La service-ul din Micălaca"
          />
        </label>

        {date.recurentaLuni && (
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-creion)]">
            Următorul se socotește de la ziua în care apeși „Făcut azi”, nu de la data
            de mai sus. Așa nu se decalează an de an.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          {date.id && (
            <button
              type="button"
              className="buton buton-secundar buton-sters"
              onClick={() =>
                porneste(async () => {
                  await scoate(date.id!);
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
            disabled={seSalveaza || date.titlu.trim() === ""}
            onClick={() =>
              porneste(async () => {
                await salveaza(date);
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
