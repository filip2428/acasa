"use client";

import { useState, useTransition } from "react";

import { candFataDeAzi } from "@/lib/formatare";
import { CATEGORII_CALENDAR, type DateEveniment, type EvenimentAfisat } from "@/lib/domeniu";

import { bifeaza } from "./actiuni";
import Fisa, { evenimentNou, recurentaInCuvinte, type CalendarPersoana } from "./Fisa";

/*
  Aceleași lucruri ca în grilă, dar strânse pe categorii și în ordinea în care
  vin peste tine. Grila arată *când*; lista asta arată *ce urmează* — la mașină,
  la casă, la sănătate.
*/

export default function Lista({
  evenimente,
  calendare,
  ziuaDeAzi,
}: {
  evenimente: EvenimentAfisat[];
  calendare: CalendarPersoana[];
  ziuaDeAzi: string;
}) {
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
                        googleCalendarId: e.googleCalendarId,
                      })
                    }
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem]">{e.titlu}</span>
                      <span className="text-xs text-[var(--color-creion)]">
                        {e.scadenta ? candFataDeAzi(e.scadenta) : "fără dată"}
                        {e.recurentaLuni ? ` · ${recurentaInCuvinte(e.recurentaLuni)}` : ""}
                        {e.googleCalendarId ? " · și în Google" : ""}
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
        onClick={() => setFisa(evenimentNou(ziuaDeAzi))}
      >
        Adaugă în calendar
      </button>

      {fisa && <Fisa date={fisa} calendare={calendare} laInchidere={() => setFisa(null)} />}
    </>
  );
}
