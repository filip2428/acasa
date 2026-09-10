"use client";

import { useOptimistic, useState, useTransition } from "react";

import {
  adaugaArticolBagaj,
  adaugaArticolSablon,
  adaugaSablon,
  comutaArticol,
  inchideBagajul,
  porneste as porneste_lista,
  stergeArticolSablon,
  stergeSablon,
} from "./actiuni";

export type Sablon = {
  id: number;
  nume: string;
  articole: { id: number; text: string }[];
};

export type Bagaj = {
  id: number;
  nume: string;
  articole: { id: number; text: string; bifat: boolean }[];
};

export default function Bagaje({ sabloane, bagaje }: { sabloane: Sablon[]; bagaje: Bagaj[] }) {
  const [sablonNou, setSablonNou] = useState("");
  const [deschis, setDeschis] = useState<number | null>(null);
  const [, porneste] = useTransition();

  return (
    <>
      {bagaje.map((bagaj) => (
        <ListaPornita key={bagaj.id} bagaj={bagaj} />
      ))}

      <section>
        <h2 className="eticheta mb-1.5 px-1">Șabloane</h2>

        {sabloane.length === 0 ? (
          <p className="card p-4 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
            Un șablon e lista de care ai nevoie de fiecare dată — „la mare”, „la
            părinți”, „city break”. Când plecați, porniți o listă din el și bifați;
            șablonul rămâne curat pentru data viitoare.
          </p>
        ) : (
          <ul className="space-y-3">
            {sabloane.map((sablon) => (
              <li key={sablon.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDeschis(deschis === sablon.id ? null : sablon.id)}
                  aria-expanded={deschis === sablon.id}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="titlu block text-lg">{sablon.nume}</span>
                    <span className="text-xs text-[var(--color-creion)]">
                      {sablon.articole.length === 0
                        ? "gol"
                        : `${sablon.articole.length} lucruri`}
                    </span>
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-creion)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className={`shrink-0 transition-transform ${
                      deschis === sablon.id ? "rotate-180" : ""
                    }`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {deschis === sablon.id && (
                  <EditorSablon sablon={sablon} porneste={porneste} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const nume = sablonNou.trim();
          if (!nume) return;
          porneste(async () => {
            await adaugaSablon(nume);
            setSablonNou("");
          });
        }}
        className="flex gap-2"
      >
        <input
          value={sablonNou}
          onChange={(e) => setSablonNou(e.target.value)}
          className="camp flex-1"
          placeholder="Șablon nou…"
          aria-label="Numele șablonului nou"
        />
        <button type="submit" className="buton buton-principal" disabled={!sablonNou.trim()}>
          Adaugă
        </button>
      </form>
    </>
  );
}

function EditorSablon({
  sablon,
  porneste,
}: {
  sablon: Sablon;
  porneste: (a: () => void) => void;
}) {
  const [articolNou, setArticolNou] = useState("");
  const [numePlecare, setNumePlecare] = useState("");
  const [pornesteListaDeschis, setPornesteListaDeschis] = useState(false);

  return (
    <div className="border-t border-[var(--color-linie)]">
      <ul>
        {sablon.articole.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 border-b border-[var(--color-linie)] px-4 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{a.text}</span>
            <button
              type="button"
              aria-label={`Scoate ${a.text}`}
              onClick={() => porneste(() => stergeArticolSablon(a.id))}
              className="shrink-0 p-1 text-[var(--color-creion)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = articolNou.trim();
          if (!text) return;
          porneste(async () => {
            await adaugaArticolSablon(sablon.id, text);
            setArticolNou("");
          });
        }}
        className="flex gap-2 px-4 py-3"
      >
        <input
          value={articolNou}
          onChange={(e) => setArticolNou(e.target.value)}
          className="camp flex-1"
          placeholder="Adaugă un lucru…"
          aria-label={`Adaugă în șablonul ${sablon.nume}`}
        />
        <button type="submit" className="buton buton-secundar" disabled={!articolNou.trim()}>
          Adaugă
        </button>
      </form>

      <div className="flex flex-wrap gap-2 border-t border-[var(--color-linie)] px-4 py-3">
        {pornesteListaDeschis ? (
          <form
            className="flex w-full gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              porneste(async () => {
                await porneste_lista(sablon.id, numePlecare || sablon.nume);
                setNumePlecare("");
                setPornesteListaDeschis(false);
              });
            }}
          >
            <input
              value={numePlecare}
              onChange={(e) => setNumePlecare(e.target.value)}
              className="camp flex-1"
              placeholder={sablon.nume}
              aria-label="Cum se numește plecarea"
              autoFocus
            />
            <button type="submit" className="buton buton-principal">
              Pornește
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="buton buton-mic buton-principal"
              disabled={sablon.articole.length === 0}
              onClick={() => setPornesteListaDeschis(true)}
            >
              Pornește o listă
            </button>
            <button
              type="button"
              className="buton buton-mic buton-sters ml-auto"
              onClick={() => porneste(() => stergeSablon(sablon.id))}
            >
              Șterge șablonul
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ListaPornita({ bagaj }: { bagaj: Bagaj }) {
  const [bifate, bifa] = useOptimistic<number[], number>([], (stare, id) =>
    stare.includes(id) ? stare.filter((x) => x !== id) : [...stare, id],
  );
  const [articolNou, setArticolNou] = useState("");
  const [, porneste] = useTransition();

  const esteBifat = (a: Bagaj["articole"][number]) =>
    bifate.includes(a.id) ? !a.bifat : a.bifat;

  const gata = bagaj.articole.filter(esteBifat).length;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <span className="eticheta">Se împachetează</span>
          <h2 className="titlu mt-1 truncate text-xl">{bagaj.nume}</h2>
        </div>
        <span className="cifre shrink-0 text-sm text-[var(--color-creion)]">
          {gata}/{bagaj.articole.length}
        </span>
      </div>

      <ul className="mt-3">
        {bagaj.articole.map((a) => {
          const bifatAcum = esteBifat(a);
          return (
            <li
              key={a.id}
              className={`flex items-center gap-3 border-t border-[var(--color-linie)] px-4 py-2.5 ${
                bifatAcum ? "opacity-45" : ""
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={bifatAcum}
                aria-label={a.text}
                onClick={() =>
                  porneste(async () => {
                    bifa(a.id);
                    await comutaArticol(a.id, !bifatAcum);
                  })
                }
                className={`flex size-[1.625rem] shrink-0 items-center justify-center rounded-full border-2 ${
                  bifatAcum
                    ? "border-[var(--color-smalt)] bg-[var(--color-smalt)] text-white"
                    : "border-[var(--color-linie)]"
                }`}
              >
                {bifatAcum && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-[0.9375rem] ${bifatAcum ? "line-through" : ""}`}>
                {a.text}
              </span>
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = articolNou.trim();
          if (!text) return;
          porneste(async () => {
            await adaugaArticolBagaj(bagaj.id, text);
            setArticolNou("");
          });
        }}
        className="flex gap-2 border-t border-[var(--color-linie)] px-4 py-3"
      >
        <input
          value={articolNou}
          onChange={(e) => setArticolNou(e.target.value)}
          className="camp flex-1"
          placeholder="Am mai nevoie de…"
          aria-label={`Adaugă la ${bagaj.nume}`}
        />
        <button type="submit" className="buton buton-secundar" disabled={!articolNou.trim()}>
          Adaugă
        </button>
      </form>

      <div className="border-t border-[var(--color-linie)] px-4 py-3">
        <button
          type="button"
          className="buton buton-mic buton-sters"
          onClick={() => porneste(() => inchideBagajul(bagaj.id))}
        >
          {gata === bagaj.articole.length ? "Gata, închide lista" : "Renunță la listă"}
        </button>
      </div>
    </section>
  );
}
