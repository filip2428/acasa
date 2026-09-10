"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import type { MasaDinPlan, RetetaAfisata } from "@/lib/domeniu";
import { MOMENTE, etichetaMomentului } from "@/lib/domeniu";
import { cuDe } from "@/lib/formatare";

import { bifeazaGatit, pune, scoateDinPlan, treciPeLista } from "./actiuni";

/*
  Planul săptămânii.

  Nu e o agendă de restaurant: o zi are cel mult trei rânduri și de obicei unul
  singur, cina. De aia zilele goale nu arată a gol, ci a invitație — un rând pe
  care scrie doar „—”, care se apasă.
*/

type RetetaClasata = RetetaAfisata & { motiv: string };

export default function Plan({
  zile,
  mese,
  retete,
  lipsuri,
}: {
  zile: { valoare: string; eticheta: string; esteAzi: boolean }[];
  mese: MasaDinPlan[];
  retete: RetetaClasata[];
  lipsuri: { produsId: number; nume: string; pentru: string[] }[];
}) {
  const [alegere, setAlegere] = useState<{ data: string; eticheta: string; esteAzi: boolean } | null>(
    null,
  );
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [lucreaza, porneste] = useTransition();

  return (
    <>
      {/* Primul bloc din pagină urcă peste antet, deci trebuie să fie un card —
          altfel titlul de secțiune ajunge sub verde și nu se mai citește. */}
      <section className="card overflow-hidden">
        <h2 className="eticheta px-3.5 pt-3">Săptămâna</h2>
        <ul className="card-lipit mt-1">
          {zile.map((zi) => {
            const aleZilei = mese.filter((m) => m.data === zi.valoare);
            return (
              <li key={zi.valoare} className="px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`text-[0.9375rem] ${
                      zi.esteAzi ? "font-semibold text-[var(--color-smalt)]" : ""
                    }`}
                  >
                    {zi.eticheta}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-[var(--color-creion)] underline"
                    onClick={() =>
                      setAlegere({ data: zi.valoare, eticheta: zi.eticheta, esteAzi: zi.esteAzi })
                    }
                  >
                    pune ceva
                  </button>
                </div>

                {aleZilei.length === 0 ? (
                  <p className="mt-0.5 text-sm text-[var(--color-linie)]">—</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {aleZilei.map((masa) => (
                      <li key={masa.id} className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 text-sm ${masa.gatitLa ? "opacity-45" : ""}`}>
                          <span className="text-[var(--color-creion)]">
                            {etichetaMomentului(masa.moment)}:
                          </span>{" "}
                          {masa.retetaId ? (
                            <Link href={`/mese/retete/${masa.retetaId}`} className="underline">
                              {masa.titlu}
                            </Link>
                          ) : (
                            masa.titlu
                          )}
                        </span>

                        {masa.gatitLa ? (
                          <span className="fisa shrink-0">gătit</span>
                        ) : (
                          <button
                            type="button"
                            className="buton buton-mic buton-secundar shrink-0"
                            disabled={lucreaza}
                            onClick={() => porneste(() => bifeazaGatit(masa.id))}
                          >
                            Gata
                          </button>
                        )}

                        <button
                          type="button"
                          aria-label={`Scoate ${masa.titlu} din plan`}
                          disabled={lucreaza}
                          onClick={() => porneste(() => scoateDinPlan(masa.id))}
                          className="shrink-0 text-[var(--color-creion)]"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {lipsuri.length > 0 && (
        <section className="card p-4">
          <span className="eticheta">Pentru ce ai planificat</span>
          <p className="titlu mt-1 text-xl">
            {lipsuri.length === 1 ? "Îți lipsește un lucru" : `Îți lipsesc ${lipsuri.length} lucruri`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-creion)]">
            {lipsuri.slice(0, 5).map((l) => l.nume).join(", ")}
            {lipsuri.length > 5 ? " și încă câteva" : ""}
          </p>
          <button
            type="button"
            className="buton buton-principal buton-mic mt-3 w-full"
            disabled={lucreaza}
            onClick={() =>
              porneste(async () => {
                setMesaj(await treciPeLista(lipsuri.map((l) => l.produsId)));
              })
            }
          >
            Pune-le pe listă
          </button>
        </section>
      )}

      {mesaj && (
        <p className="rounded-xl bg-[var(--color-smalt-palid)] p-3 text-sm text-[var(--color-smalt-adanc)]">
          {mesaj}
        </p>
      )}

      <Link href="/mese/retete" className="buton buton-secundar w-full">
        Caietul de rețete
      </Link>

      {alegere && (
        <AlegeReteta
          zi={alegere}
          retete={retete}
          laAlegere={(retetaId, moment) =>
            porneste(async () => {
              await pune(alegere.data, moment, retetaId);
              setAlegere(null);
            })
          }
          laInchidere={() => setAlegere(null)}
        />
      )}
    </>
  );
}

function AlegeReteta({
  zi,
  retete,
  laAlegere,
  laInchidere,
}: {
  zi: { data: string; eticheta: string; esteAzi: boolean };
  retete: RetetaClasata[];
  laAlegere: (retetaId: number, moment: string) => void;
  laInchidere: () => void;
}) {
  const [moment, setMoment] = useState("cina");
  const [termen, setTermen] = useState("");

  const gasite = useMemo(() => {
    const curat = termen.trim().toLowerCase();
    if (!curat) return retete.slice(0, 20);
    return retete.filter((r) => r.titlu.toLowerCase().includes(curat)).slice(0, 20);
  }, [retete, termen]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Închide"
        onClick={laInchidere}
        className="absolute inset-0 bg-black/35"
      />

      <section
        className="intra relative max-h-[85dvh] overflow-y-auto rounded-t-[1.5rem] bg-[var(--color-chit)] p-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-linie)]" />

        <h2 className="eticheta">Ce punem {zi.eticheta}</h2>

        <div className="mt-2 flex gap-2">
          {MOMENTE.map((m) => (
            <button
              key={m.valoare}
              type="button"
              onClick={() => setMoment(m.valoare)}
              aria-pressed={moment === m.valoare}
              className={`buton buton-mic flex-1 ${
                moment === m.valoare ? "buton-principal" : "buton-secundar"
              }`}
            >
              {m.eticheta}
            </button>
          ))}
        </div>

        <input
          value={termen}
          onChange={(e) => setTermen(e.target.value)}
          className="camp mt-3"
          type="search"
          placeholder="Caută o rețetă…"
          aria-label="Caută o rețetă"
        />

        {retete.length === 0 ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-creion)]">
            Nu e nicio rețetă în caiet încă.
          </p>
        ) : (
          <ul className="card card-lipit mt-3 overflow-hidden">
            {gasite.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => laAlegere(r.id, moment)}
                  className="w-full px-3.5 py-2.5 text-left"
                >
                  <span className="block truncate text-[0.9375rem]">{r.titlu}</span>
                  <span className="text-xs text-[var(--color-creion)]">
                    {/* Motivul e adevărat doar pentru azi: „expiră mâine” n-are ce
                        căuta când planifici sâmbăta. Atunci spunem doar ce știm sigur. */}
                    {zi.esteAzi
                      ? r.motiv
                      : [
                          r.dinTotal > 0 ? `ai ${r.ai} din ${r.dinTotal}` : null,
                          r.minuteTotal ? cuDe(r.minuteTotal, "minute") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
