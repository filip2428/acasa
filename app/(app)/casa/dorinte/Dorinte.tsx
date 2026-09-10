"use client";

import { useState, useTransition } from "react";

import { lei } from "@/lib/formatare";

import {
  comutaCumparat,
  salveazaDorinta,
  stergeDorinta,
  type DateDorinta,
} from "./actiuni";

/*
  Lucrurile pe care le vrem pentru casă, cândva.

  Rostul listei e să nu se mai piardă prin conversații. De asta are prioritate
  („curând” / „cândva”) și preț: la sfârșit de lună, când vezi că ai rămas cu
  bani, vrei să știi imediat ce merită luat.
*/

type Dorinta = {
  id: number;
  titlu: string;
  pret: number | null;
  url: string | null;
  prioritate: number;
  notite: string | null;
  stare: string;
};

const PRIORITATI: [valoare: number, eticheta: string][] = [
  [1, "curând"],
  [2, "când se poate"],
  [3, "cândva"],
];

const NOUA: DateDorinta = {
  titlu: "",
  pret: null,
  url: null,
  prioritate: 2,
  notite: null,
};

export default function Dorinte({ dorinte }: { dorinte: Dorinta[] }) {
  const [fisa, setFisa] = useState<DateDorinta | null>(null);
  const [aratCumparate, setAratCumparate] = useState(false);
  const [, porneste] = useTransition();

  const idei = dorinte.filter((d) => d.stare === "idee");
  const cumparate = dorinte.filter((d) => d.stare === "cumparat");
  const total = idei.reduce((t, d) => t + (d.pret ?? 0), 0);

  const grupe = PRIORITATI.map(([valoare, eticheta]) => ({
    eticheta,
    lista: idei.filter((d) => d.prioritate === valoare),
  })).filter((g) => g.lista.length > 0);

  return (
    <>
      {total > 0 && (
        <section className="card p-4">
          <div className="flex items-baseline justify-between">
            <span className="eticheta">Tot ce e pe listă</span>
            <span className="cifre text-[1.5rem] leading-none font-medium">
              {lei(total, true)}
            </span>
          </div>
        </section>
      )}

      {idei.length === 0 && (
        <p className="px-1 py-8 text-center text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
          Mobilă, unelte, lucruri pentru casă — ce vă tot spuneți că ar trebui luat
          și apoi uitați până data viitoare.
        </p>
      )}

      {grupe.map((grupa) => (
        <section key={grupa.eticheta}>
          <h2 className="eticheta mb-1.5 px-1">{grupa.eticheta}</h2>
          <ul className="card card-lipit overflow-hidden">
            {grupa.lista.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  aria-label={`Marchează drept cumpărat: ${d.titlu}`}
                  onClick={() => porneste(() => comutaCumparat(d.id, true))}
                  className="size-[1.625rem] shrink-0 rounded-full border-2 border-[var(--color-linie)]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFisa({
                      id: d.id,
                      titlu: d.titlu,
                      pret: d.pret,
                      url: d.url,
                      prioritate: d.prioritate,
                      notite: d.notite,
                    })
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[0.9375rem]">{d.titlu}</span>
                  {d.notite && (
                    <span className="block truncate text-xs text-[var(--color-creion)]">
                      {d.notite}
                    </span>
                  )}
                </button>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Deschide linkul pentru ${d.titlu}`}
                    className="shrink-0 p-1 text-[var(--color-creion)]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M14 4h6v6M20 4l-9 9" />
                      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
                    </svg>
                  </a>
                )}
                <span className="cifre shrink-0 text-sm text-[var(--color-creion)]">
                  {d.pret != null ? lei(d.pret, true) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <button type="button" className="buton buton-principal w-full" onClick={() => setFisa(NOUA)}>
        Adaugă o dorință
      </button>

      {cumparate.length > 0 && (
        <div>
          <button
            type="button"
            className="buton buton-secundar w-full"
            onClick={() => setAratCumparate((a) => !a)}
          >
            {aratCumparate ? "Ascunde" : `Arată cele luate (${cumparate.length})`}
          </button>

          {aratCumparate && (
            <ul className="card card-lipit mt-3 overflow-hidden opacity-60">
              {cumparate.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem] line-through">
                    {d.titlu}
                  </span>
                  <button
                    type="button"
                    className="buton buton-mic buton-sters"
                    onClick={() => porneste(() => comutaCumparat(d.id, false))}
                  >
                    Înapoi pe listă
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {fisa && <Fisa date={fisa} laInchidere={() => setFisa(null)} />}
    </>
  );
}

function Fisa({ date: initiale, laInchidere }: { date: DateDorinta; laInchidere: () => void }) {
  const [date, setDate] = useState(initiale);
  const [seSalveaza, porneste] = useTransition();

  const schimba = <C extends keyof DateDorinta>(camp: C, valoare: DateDorinta[C]) =>
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
            placeholder="Bibliotecă pentru living"
            autoFocus={!date.id}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label>
            <span className="eticheta">Cam cât</span>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={date.pret ?? ""}
              onChange={(e) => schimba("pret", e.target.value === "" ? null : Number(e.target.value))}
              className="camp cifre mt-1"
              placeholder="0"
            />
          </label>

          <label>
            <span className="eticheta">Cât de repede</span>
            <select
              value={date.prioritate}
              onChange={(e) => schimba("prioritate", Number(e.target.value))}
              className="camp mt-1"
            >
              {PRIORITATI.map(([valoare, eticheta]) => (
                <option key={valoare} value={valoare}>
                  {eticheta}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="eticheta">Link (opțional)</span>
          <input
            type="url"
            inputMode="url"
            value={date.url ?? ""}
            onChange={(e) => schimba("url", e.target.value || null)}
            className="camp mt-1"
            placeholder="https://…"
            autoCapitalize="off"
          />
        </label>

        <label className="mt-3 block">
          <span className="eticheta">Notițe (opțional)</span>
          <input
            value={date.notite ?? ""}
            onChange={(e) => schimba("notite", e.target.value || null)}
            className="camp mt-1"
            placeholder="Măsurat: max 180 cm lățime"
          />
        </label>

        <div className="mt-5 flex gap-2">
          {date.id && (
            <button
              type="button"
              className="buton buton-secundar buton-sters"
              onClick={() =>
                porneste(async () => {
                  await stergeDorinta(date.id!);
                  laInchidere();
                })
              }
            >
              Șterge
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
                await salveazaDorinta(date);
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
