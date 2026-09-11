"use client";

import { useMemo, useState, useTransition } from "react";

import { lei } from "@/lib/formatare";
import {
  textIngredient,
  UNITATI_RETETA,
  unitateaDeReteta,
} from "@/lib/servicii/socoteli-meniu";

import { adauga, puneProdusNou } from "../../actiuni";

/*
  Ingredientele alese din catalog.

  E drumul lung, pentru cine vrea să treacă prin raioane ca printr-un magazin:
  „ce-mi trebuie la ciorbă — ceapă, morcovi, smântână”. Foaia rămâne deschisă
  între alegeri, pentru că o rețetă nu are un singur ingredient.

  Cantitatea e opțională. Se scrie în unitatea de gătit (grame, nu kilograme),
  pentru că așa scrie și în orice rețetă.
*/

export type ProdusDinCatalog = {
  id: number;
  nume: string;
  unitate: string;
  mereuInCasa: boolean;
  pretUltim: number | null;
  categorie: string;
  ordineCategorie: number;
  inCasa: boolean;
};

export default function AlegeDinCatalog({
  retetaId,
  produse,
  dejaInReteta,
  laInchidere,
}: {
  retetaId: number;
  produse: ProdusDinCatalog[];
  dejaInReteta: number[];
  laInchidere: () => void;
}) {
  const [termen, setTermen] = useState("");
  const [deschis, setDeschis] = useState<number | null>(null);
  const [puse, setPuse] = useState<number[]>([]);
  const [numeNoi, setNumeNoi] = useState<string[]>([]);
  const [lucreaza, porneste] = useTransition();

  const inReteta = (id: number) => dejaInReteta.includes(id) || puse.includes(id);
  const curat = termen.trim();

  const grupe = useMemo(() => {
    const cautat = curat.toLowerCase();
    const gasite = cautat
      ? produse.filter((p) => p.nume.toLowerCase().includes(cautat))
      : produse;

    const peCategorii = new Map<string, { ordine: number; produse: ProdusDinCatalog[] }>();
    for (const p of gasite) {
      const grupa = peCategorii.get(p.categorie);
      if (grupa) grupa.produse.push(p);
      else peCategorii.set(p.categorie, { ordine: p.ordineCategorie, produse: [p] });
    }

    return [...peCategorii.entries()]
      .map(([nume, g]) => ({ nume, ...g }))
      .sort((a, b) => a.ordine - b.ordine);
  }, [produse, curat]);

  const nimic = grupe.length === 0;
  // Dacă ce ai scris există deja cu numele ăsta, butonul de creat n-are ce căuta:
  // ar părea că face o a doua „Ceapă”.
  const existaDeja = produse.some(
    (p) => p.nume.localeCompare(curat, "ro", { sensitivity: "base" }) === 0,
  );
  const cate = puse.length + numeNoi.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Închide"
        onClick={laInchidere}
        className="absolute inset-0 bg-black/35"
      />

      <section className="intra relative flex max-h-[90dvh] flex-col rounded-t-[1.5rem] bg-[var(--color-chit)]">
        <div className="p-4 pb-2">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-linie)]" />
          <h2 className="eticheta">Din catalog</h2>
          <input
            value={termen}
            onChange={(e) => setTermen(e.target.value)}
            className="camp mt-2"
            type="search"
            placeholder="Caută: ceapă, smântână…"
            aria-label="Caută în catalog"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
          {grupe.map((grupa) => (
            <section key={grupa.nume}>
              <h3 className="eticheta mb-1.5 px-1">{grupa.nume}</h3>
              <ul className="card card-lipit overflow-hidden">
                {grupa.produse.map((p) => (
                  <Rand
                    key={p.id}
                    produs={p}
                    inReteta={inReteta(p.id)}
                    deschis={deschis === p.id}
                    lucreaza={lucreaza}
                    laDeschidere={() => setDeschis(deschis === p.id ? null : p.id)}
                    laPunere={(cantitate, unitate) =>
                      porneste(async () => {
                        setPuse((s) => [...s, p.id]);
                        setDeschis(null);
                        await adauga(retetaId, {
                          textOriginal: textIngredient(p.nume, cantitate, unitate),
                          produsId: p.id,
                          cantitate,
                          unitate,
                        });
                      })
                    }
                  />
                ))}
              </ul>
            </section>
          ))}

          {curat && !existaDeja && !numeNoi.includes(curat.toLowerCase()) && (
            <div className={nimic ? "" : "pt-1"}>
              {nimic && (
                <p className="mb-2 px-1 text-sm text-[var(--color-creion)]">
                  „{curat}” nu e în catalog.
                </p>
              )}
              <button
                type="button"
                className="buton buton-secundar w-full"
                disabled={lucreaza}
                onClick={() =>
                  porneste(async () => {
                    setNumeNoi((s) => [...s, curat.toLowerCase()]);
                    setTermen("");
                    await puneProdusNou(retetaId, curat, null, null);
                  })
                }
              >
                Pune „{curat}” în catalog și în rețetă
              </button>
            </div>
          )}
        </div>

        <div
          className="border-t border-[var(--color-linie)] px-4 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          <button type="button" className="buton buton-principal w-full" onClick={laInchidere}>
            {cate === 0 ? "Închide" : `Gata · ${cate === 1 ? "un ingredient pus" : `${cate} ingrediente puse`}`}
          </button>
        </div>
      </section>
    </div>
  );
}

function Rand({
  produs,
  inReteta,
  deschis,
  lucreaza,
  laDeschidere,
  laPunere,
}: {
  produs: ProdusDinCatalog;
  inReteta: boolean;
  deschis: boolean;
  lucreaza: boolean;
  laDeschidere: () => void;
  laPunere: (cantitate: number | null, unitate: string | null) => void;
}) {
  const [cantitate, setCantitate] = useState("");
  const [unitate, setUnitate] = useState(unitateaDeReteta(produs.unitate));

  const detalii = [
    produs.mereuInCasa ? "mereu în casă" : produs.inCasa ? "ai în casă" : null,
    produs.pretUltim != null ? lei(produs.pretUltim) : null,
  ].filter(Boolean);

  return (
    <li>
      <button
        type="button"
        onClick={laDeschidere}
        disabled={inReteta}
        aria-expanded={deschis}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[0.9375rem] ${inReteta ? "opacity-45" : ""}`}>
            {produs.nume}
          </span>
          {detalii.length > 0 && (
            <span className="text-xs text-[var(--color-creion)]">{detalii.join(" · ")}</span>
          )}
        </span>

        {inReteta ? (
          <span className="fisa shrink-0">în rețetă</span>
        ) : (
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-linie)] text-lg leading-none text-[var(--color-smalt)]"
          >
            {deschis ? "−" : "+"}
          </span>
        )}
      </button>

      {deschis && !inReteta && (
        <div className="flex items-center gap-2 px-3.5 pb-3">
          <div className="w-20 shrink-0">
            <input
              value={cantitate}
              onChange={(e) => setCantitate(e.target.value)}
              className="camp cifre"
              inputMode="decimal"
              placeholder="cât"
              aria-label={`Cantitate de ${produs.nume}`}
              autoFocus
            />
          </div>
          <div className="w-28 shrink-0">
            <select
              value={unitate}
              onChange={(e) => setUnitate(e.target.value)}
              className="camp"
              aria-label="Unitate"
            >
              {UNITATI_RETETA.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="buton buton-principal flex-1"
            disabled={lucreaza}
            onClick={() => {
              const numar = Number(cantitate.replace(",", "."));
              const are = cantitate.trim() !== "" && Number.isFinite(numar) && numar > 0;
              laPunere(are ? numar : null, are ? unitate : null);
            }}
          >
            Pune
          </button>
        </div>
      )}
    </li>
  );
}
