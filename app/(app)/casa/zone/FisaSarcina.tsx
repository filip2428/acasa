"use client";

import { useState, useTransition } from "react";

import type { SarcinaAfisata } from "@/lib/servicii/casa";

import { salveazaSarcina, scoateSarcina, type DateSarcina } from "./actiuni";

/*
  Fișa unei trebi. Frecvența se alege dintr-o listă în cuvinte, nu se tastează
  în zile: nimeni nu gândește „la 14 zile”, toată lumea gândește „o dată la
  două săptămâni”.
*/

const FRECVENTE: [zile: number, eticheta: string][] = [
  [1, "zilnic"],
  [2, "la două zile"],
  [3, "de două ori pe săptămână"],
  [7, "săptămânal"],
  [14, "la două săptămâni"],
  [21, "la trei săptămâni"],
  [30, "lunar"],
  [60, "la două luni"],
  [90, "la trei luni"],
  [180, "la șase luni"],
  [365, "o dată pe an"],
];

const EFORTURI: [valoare: string, eticheta: string][] = [
  ["usor", "ușor"],
  ["mediu", "mediu"],
  ["greu", "greu"],
];

export function sarcinaNoua(zonaId: number): DateSarcina {
  return {
    zonaId,
    titlu: "",
    tip: "curatenie",
    frecventaZile: 7,
    minuteEstimate: 15,
    efort: "mediu",
    atribuitLui: null,
    rotatie: false,
    evitaLaMenstruatie: false,
  };
}

export function dinSarcina(sarcina: SarcinaAfisata, zonaId: number): DateSarcina {
  return {
    id: sarcina.id,
    zonaId,
    titlu: sarcina.titlu,
    tip: sarcina.tip,
    frecventaZile: sarcina.frecventaZile,
    minuteEstimate: sarcina.minuteEstimate,
    efort: sarcina.efort,
    atribuitLui: sarcina.atribuitLui,
    rotatie: sarcina.rotatie,
    evitaLaMenstruatie: sarcina.evitaLaMenstruatie,
  };
}

export default function FisaSarcina({
  date: initiale,
  persoane,
  laInchidere,
}: {
  date: DateSarcina;
  persoane: { id: number; nume: string }[];
  laInchidere: () => void;
}) {
  const [date, setDate] = useState(initiale);
  const [seSalveaza, porneste] = useTransition();

  const schimba = <C extends keyof DateSarcina>(camp: C, valoare: DateSarcina[C]) =>
    setDate((d) => ({ ...d, [camp]: valoare }));

  const esteDeclutter = date.tip === "declutter";

  // Dacă frecvența salvată nu e în listă, o arătăm oricum, ca să n-o pierdem.
  const frecvente =
    date.frecventaZile != null && !FRECVENTE.some(([z]) => z === date.frecventaZile)
      ? [...FRECVENTE, [date.frecventaZile, `la ${date.frecventaZile} zile`] as const].sort(
          (a, b) => a[0] - b[0],
        )
      : FRECVENTE;

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
          <span className="eticheta">Ce e de făcut</span>
          <input
            value={date.titlu}
            onChange={(e) => schimba("titlu", e.target.value)}
            className="camp mt-1"
            placeholder="Spălat pe jos"
            autoFocus={!date.id}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {/*
            Declutterul n-are frecvență proprie: vine când îi ajunge zonei rândul
            în rotația lunară, deci un selector de zile ar minți.
          */}
          {esteDeclutter ? (
            <div>
              <span className="eticheta">Cât de des</span>
              <p className="mt-1 flex min-h-[2.875rem] items-center rounded-xl border border-[var(--color-linie)] bg-[var(--color-smalt-palid)] px-3 text-sm text-[var(--color-smalt-adanc)]">
                prin rotație, o zonă pe lună
              </p>
            </div>
          ) : (
            <label>
              <span className="eticheta">Cât de des</span>
              <select
                value={date.frecventaZile ?? ""}
                onChange={(e) =>
                  schimba("frecventaZile", e.target.value ? Number(e.target.value) : null)
                }
                className="camp mt-1"
              >
                <option value="">doar când zic eu</option>
                {frecvente.map(([zile, eticheta]) => (
                  <option key={zile} value={zile}>
                    {eticheta}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span className="eticheta">Cât durează</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="240"
                value={date.minuteEstimate}
                onChange={(e) => schimba("minuteEstimate", Number(e.target.value))}
                className="camp cifre"
              />
              <span className="text-sm text-[var(--color-creion)]">min</span>
            </div>
          </label>
        </div>

        <fieldset className="mt-3">
          <legend className="eticheta">Efort</legend>
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

        <label className="mt-3 block">
          <span className="eticheta">Cine o face</span>
          <select
            value={date.rotatie ? "rotatie" : (date.atribuitLui ?? "")}
            onChange={(e) => {
              if (e.target.value === "rotatie") {
                setDate((d) => ({ ...d, rotatie: true, atribuitLui: null }));
              } else {
                setDate((d) => ({
                  ...d,
                  rotatie: false,
                  atribuitLui: e.target.value ? Number(e.target.value) : null,
                }));
              }
            }}
            className="camp mt-1"
          >
            <option value="">oricine</option>
            {persoane.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nume}
              </option>
            ))}
            <option value="rotatie">pe rând, alternativ</option>
          </select>
        </label>

        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={date.evitaLaMenstruatie}
            onChange={(e) => schimba("evitaLaMenstruatie", e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-smalt)]"
          />
          <span className="text-sm leading-snug">
            Nu o propune în zilele cu menstruație
            <span className="block text-xs text-[var(--color-creion)]">
              Rămâne pe listă, doar că motorul de propuneri o sare în zilele alea.
            </span>
          </span>
        </label>

        <div className="mt-5 flex gap-2">
          {date.id && (
            <button
              type="button"
              className="buton buton-secundar buton-sters"
              onClick={() =>
                porneste(async () => {
                  await scoateSarcina(date.id!);
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
                await salveazaSarcina(date);
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

/** „săptămânal”, „la două luni” — pentru afișarea din listă. */
export function frecventaInCuvinte(zile: number | null) {
  if (zile == null) return "la cerere";
  return FRECVENTE.find(([z]) => z === zile)?.[1] ?? `la ${zile} zile`;
}
