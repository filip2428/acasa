"use client";

import { useState, useTransition } from "react";

import { CATEGORII_CALENDAR, type DateEveniment } from "@/lib/domeniu";

import { salveaza, scoate } from "./actiuni";

/*
  Fișa unui lucru din calendarul casei.

  Recurența se alege în luni, nu în zile, pentru că exact așa se vorbește despre
  lucrurile astea: ITP la doi ani, revizie la un an, detartraj la șase luni.
*/

export const RECURENTE: [luni: number | null, eticheta: string][] = [
  [null, "o singură dată"],
  [1, "lunar"],
  [3, "la trei luni"],
  [6, "la șase luni"],
  [12, "anual"],
  [24, "la doi ani"],
  [60, "la cinci ani"],
];

export function recurentaInCuvinte(luni: number | null) {
  return RECURENTE.find(([l]) => l === luni)?.[1] ?? `la ${luni} luni`;
}

export type CalendarPersoana = { persoanaId: number; nume: string; calendarId: string };

export function evenimentNou(ziua: string): DateEveniment {
  return {
    titlu: "",
    categorie: "masina",
    data: ziua,
    recurentaLuni: 12,
    remindereZileInainte: 14,
    notite: null,
    googleCalendarId: null,
  };
}

export default function Fisa({
  date: initiale,
  calendare,
  laInchidere,
}: {
  date: DateEveniment;
  calendare: CalendarPersoana[];
  laInchidere: () => void;
}) {
  const [date, setDate] = useState(initiale);
  const [avertisment, setAvertisment] = useState<string | null>(null);
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
            {/* Câmpul e lat cât scrie în el; „.camp” pune lățime 100%, deci
                limita trebuie pusă pe ceva din jurul lui. */}
            <div className="w-24 shrink-0">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="90"
                value={date.remindereZileInainte}
                onChange={(e) => schimba("remindereZileInainte", Number(e.target.value))}
                className="camp cifre"
              />
            </div>
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

        {calendare.length > 0 && (
          <fieldset className="mt-3">
            <legend className="eticheta">Și în Google Calendar</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Alegere
                activ={date.googleCalendarId === null}
                onClick={() => schimba("googleCalendarId", null)}
              >
                Nu
              </Alegere>
              {calendare.map((c) => (
                <Alegere
                  key={c.persoanaId}
                  activ={date.googleCalendarId === c.calendarId}
                  onClick={() => schimba("googleCalendarId", c.calendarId)}
                >
                  {c.nume}
                </Alegere>
              ))}
            </div>
          </fieldset>
        )}

        {date.recurentaLuni && (
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-creion)]">
            Următorul se socotește de la ziua în care apeși „Făcut azi”, nu de la data
            de mai sus. Așa nu se decalează an de an.
          </p>
        )}

        {avertisment && (
          <p className="mt-3 rounded-xl bg-[var(--color-caramida-palid)] p-3 text-sm leading-relaxed text-[#8c3626]">
            {avertisment}
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
                const raspuns = await salveaza(date);
                // Dacă Google n-a primit copia, ținem fișa deschisă cu explicația:
                // altfel omul ar pleca de aici crezând că e trecut și acolo.
                if (raspuns?.avertisment) setAvertisment(raspuns.avertisment);
                else laInchidere();
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

function Alegere({
  activ,
  onClick,
  children,
}: {
  activ: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activ}
      className={`buton buton-mic ${activ ? "buton-principal" : "buton-secundar"}`}
    >
      {children}
    </button>
  );
}
