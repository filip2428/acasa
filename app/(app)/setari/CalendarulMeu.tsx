"use client";

import { useState, useTransition } from "react";

import { dezleagaCalendarul, leagaCalendarul } from "./actiuni";

/*
  Legarea calendarului, din perspectiva celui care o face.

  Textul de aici e singurul loc din aplicație unde apare adresa contului de
  serviciu — ea e tot ce trebuie copiat în Google. Restul e o verificare care
  spune pe loc dacă a mers, nu „am salvat” urmat de tăcere.
*/

export default function CalendarulMeu({
  calendarId,
  emailServiciu,
}: {
  calendarId: string | null;
  emailServiciu: string | null;
}) {
  const [adresa, setAdresa] = useState(calendarId ?? "");
  const [raspuns, setRaspuns] = useState<{ bun: boolean; text: string } | null>(null);
  const [lucreaza, porneste] = useTransition();

  if (!emailServiciu) {
    return (
      <p className="text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
        Aplicația nu e legată de Google, așa că nu are cu ce să-ți citească calendarul.
      </p>
    );
  }

  return (
    <div>
      {calendarId ? (
        <p className="text-[0.9375rem] leading-relaxed">
          Citim calendarul <strong className="break-all">{calendarId}</strong>. Apare în
          grila lunii, cu culoarea ta, și ne ajută să vedem când ai o după-masă liberă.
        </p>
      ) : (
        <ol className="space-y-1.5 text-[0.9375rem] leading-relaxed">
          <li>
            1. În Google Calendar, la calendarul tău → Setări → „Partajați cu anumite
            persoane” → adaugă{" "}
            <strong className="break-all cifre text-sm">{emailServiciu}</strong> cu
            dreptul „Vizualizați toate detaliile evenimentelor”.
          </li>
          <li>2. Scrie mai jos adresa calendarului (de obicei chiar adresa ta de Gmail).</li>
        </ol>
      )}

      <input
        value={adresa}
        onChange={(e) => setAdresa(e.target.value)}
        className="camp mt-3"
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder="numele.tau@gmail.com"
        aria-label="Adresa calendarului Google"
      />

      <div className="mt-2 flex gap-2">
        {calendarId && (
          <button
            type="button"
            className="buton buton-secundar buton-sters"
            disabled={lucreaza}
            onClick={() =>
              porneste(async () => {
                await dezleagaCalendarul();
                setAdresa("");
                setRaspuns(null);
              })
            }
          >
            Dezleagă
          </button>
        )}
        <button
          type="button"
          className="buton buton-principal flex-1"
          disabled={lucreaza}
          onClick={() =>
            porneste(async () => {
              const r = await leagaCalendarul(adresa);
              setRaspuns(
                r.merge
                  ? {
                      bun: true,
                      text:
                        r.cate === 0
                          ? "Merge. N-ai nimic în următoarele 30 de zile."
                          : `Merge. Am văzut ${r.cate} ${
                              r.cate === 1 ? "eveniment" : "evenimente"
                            } în următoarele 30 de zile.`,
                    }
                  : { bun: false, text: r.motiv },
              );
            })
          }
        >
          {lucreaza ? "Verific…" : calendarId ? "Verifică din nou" : "Verifică și leagă"}
        </button>
      </div>

      {raspuns && (
        <p
          className={`mt-2 rounded-xl p-3 text-sm leading-relaxed ${
            raspuns.bun
              ? "bg-[var(--color-smalt-palid)] text-[var(--color-smalt-adanc)]"
              : "bg-[var(--color-caramida-palid)] text-[#8c3626]"
          }`}
        >
          {raspuns.text}
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-[var(--color-creion)]">
        Dacă vrei să poți trece lucruri din aplicație <em>în</em> calendarul tău, pune
        partajarea pe „Faceți modificări la evenimente”. Doar la citire e de ajuns pentru
        tot restul.
      </p>
    </div>
  );
}
