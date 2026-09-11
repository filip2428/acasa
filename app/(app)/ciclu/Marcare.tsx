"use client";

import { useState, useTransition } from "react";

import { marcheazaInceputul, marcheazaSfarsitul, scoateMarcarea } from "./actiuni";

/*
  Marcarea ciclului: două întrebări, „a început?” și „s-a terminat?”.

  Butonul mare răspunde la întrebarea care contează acum. Dacă menstruația e în
  curs și nemarcată ca terminată, e „S-a terminat azi”; altfel, „A început azi”.
  Pentru ziua de ieri sau de acum trei zile există „Altă zi”, pentru că exact
  asta se întâmplă: îți amintești abia seara.
*/

export default function Marcare({
  inCurs,
  ziuaDeAzi,
}: {
  /** Menstruația din ciclul de acum e în desfășurare și nemarcată ca terminată. */
  inCurs: boolean;
  ziuaDeAzi: string;
}) {
  const [altaZi, setAltaZi] = useState(false);
  const [zi, setZi] = useState(ziuaDeAzi);
  const [problema, setProblema] = useState<string | null>(null);
  const [lucreaza, porneste] = useTransition();

  function marcheaza(ce: "inceput" | "sfarsit", cand: string) {
    porneste(async () => {
      setProblema(null);
      const raspuns =
        ce === "inceput" ? await marcheazaInceputul(cand) : await marcheazaSfarsitul(cand);
      if (raspuns) setProblema(raspuns);
      else setAltaZi(false);
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          className="buton buton-principal flex-1"
          disabled={lucreaza}
          onClick={() => marcheaza(inCurs ? "sfarsit" : "inceput", ziuaDeAzi)}
        >
          {inCurs ? "S-a terminat azi" : "A început azi"}
        </button>
        <button
          type="button"
          className="buton buton-secundar"
          aria-expanded={altaZi}
          onClick={() => setAltaZi((a) => !a)}
        >
          Altă zi
        </button>
      </div>

      {altaZi && (
        <div className="mt-3">
          <label className="block">
            <span className="eticheta">Ziua</span>
            <input
              type="date"
              value={zi}
              max={ziuaDeAzi}
              onChange={(e) => setZi(e.target.value)}
              className="camp mt-1"
            />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="buton buton-secundar buton-mic"
              disabled={lucreaza || !zi}
              onClick={() => marcheaza("inceput", zi)}
            >
              A început atunci
            </button>
            <button
              type="button"
              className="buton buton-secundar buton-mic"
              disabled={lucreaza || !zi}
              onClick={() => marcheaza("sfarsit", zi)}
            >
              S-a terminat atunci
            </button>
          </div>
        </div>
      )}

      {problema && (
        <p className="mt-3 rounded-xl bg-[var(--color-caramida-palid)] p-3 text-sm leading-relaxed text-[#8c3626]">
          {problema}
        </p>
      )}
    </div>
  );
}

/** Ciclurile marcate, de la cel mai nou. Cea care le-a marcat le poate scoate pe cele greșite. */
export function Istoric({
  cicluri,
  potScoate,
}: {
  cicluri: { id: number; inceput: string; text: string; detalii: string }[];
  potScoate: boolean;
}) {
  const [deschis, setDeschis] = useState<number | null>(null);
  const [scoase, setScoase] = useState<number[]>([]);
  const [, porneste] = useTransition();

  const vizibile = cicluri.filter((c) => !scoase.includes(c.id));
  if (vizibile.length === 0) return null;

  return (
    <ul className="card card-lipit overflow-hidden">
      {vizibile.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            disabled={!potScoate}
            aria-expanded={deschis === c.id}
            onClick={() => setDeschis(deschis === c.id ? null : c.id)}
            className="flex w-full items-baseline justify-between gap-3 px-3.5 py-2.5 text-left"
          >
            <span className="text-[0.9375rem]">{c.text}</span>
            <span className="cifre shrink-0 text-xs text-[var(--color-creion)]">{c.detalii}</span>
          </button>

          {potScoate && deschis === c.id && (
            <div className="flex items-center justify-between gap-3 px-3.5 pb-3">
              <span className="text-xs text-[var(--color-creion)]">Marcat din greșeală?</span>
              <button
                type="button"
                className="buton buton-mic buton-secundar buton-sters"
                onClick={() =>
                  porneste(async () => {
                    setScoase((s) => [...s, c.id]);
                    await scoateMarcarea(c.id);
                  })
                }
              >
                Scoate-l
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
