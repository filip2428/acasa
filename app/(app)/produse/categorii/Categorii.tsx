"use client";

import { useState, useTransition } from "react";

import { adaugaCategorie, mutaCategoria, schimbaCategoria, scoateCategoria } from "../actiuni";

/*
  Categoriile de cumpărături, puse în ordinea în care umbli prin magazin.

  Fiecare spune și unde intră în buget la închiderea listei: detergentul la
  Curatenie, nu la Mâncare. Categoriile de buget vin din foaia lunii, ca să nu
  putem alege una pe care formulele n-o adună.
*/

type Rand = { id: number; nume: string; categorieBuget: string | null; produse: number };

const IMPLICIT = "Mâncare";

export default function Categorii({ categorii, dinBuget }: { categorii: Rand[]; dinBuget: string[] }) {
  const [nume, setNume] = useState("");
  const [buget, setBuget] = useState<string>("");
  const [seFace, porneste] = useTransition();

  function adauga() {
    const curat = nume.trim();
    if (!curat) return;
    porneste(async () => {
      await adaugaCategorie(curat, buget || null);
      setNume("");
      setBuget("");
    });
  }

  return (
    <>
      <p className="px-1 text-sm leading-relaxed text-[var(--color-creion)]">
        Lista de cumpărături le arată în ordinea de aici, ca să treci prin magazin o singură
        dată. Săgețile schimbă ordinea.
      </p>

      {categorii.length > 0 && (
        <ul className="card card-lipit overflow-hidden">
          {categorii.map((c, i) => (
            <RandCategorie
              key={c.id}
              categorie={c}
              dinBuget={dinBuget}
              primul={i === 0}
              ultimul={i === categorii.length - 1}
            />
          ))}
        </ul>
      )}

      <section className="card space-y-3 p-4">
        <h2 className="titlu text-lg">Categorie nouă</h2>
        <input
          value={nume}
          onChange={(e) => setNume(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adauga();
            }
          }}
          className="camp"
          placeholder="Animale, Bebe, Farmacie…"
          aria-label="Numele categoriei"
          enterKeyHint="done"
        />
        <AlegeBuget valoare={buget} dinBuget={dinBuget} onAlege={setBuget} />
        <button
          type="button"
          onClick={adauga}
          disabled={seFace || !nume.trim()}
          className="buton buton-principal w-full"
        >
          {seFace ? "Se adaugă…" : "Adaugă categoria"}
        </button>
      </section>
    </>
  );
}

function RandCategorie({
  categorie,
  dinBuget,
  primul,
  ultimul,
}: {
  categorie: Rand;
  dinBuget: string[];
  primul: boolean;
  ultimul: boolean;
}) {
  const [deschis, setDeschis] = useState(false);
  const [nume, setNume] = useState(categorie.nume);
  const [confirmaScoaterea, setConfirmaScoaterea] = useState(false);
  const [seLucreaza, porneste] = useTransition();

  return (
    <li className={seLucreaza ? "opacity-60" : undefined}>
      <div className="flex items-center gap-2 px-3.5 py-2">
        <button
          type="button"
          onClick={() => setDeschis((d) => !d)}
          aria-expanded={deschis}
          className="min-w-0 flex-1 py-0.5 text-left"
        >
          <span className="block truncate text-[0.9375rem]">{categorie.nume}</span>
          <span className="block truncate text-xs text-[var(--color-creion)]">
            {categorie.produse === 1 ? "un produs" : `${categorie.produse} produse`} · în buget la{" "}
            {categorie.categorieBuget ?? IMPLICIT}
          </span>
        </button>
        <Sageata
          eticheta={`Urcă ${categorie.nume}`}
          dezactivata={primul || seLucreaza}
          onClick={() => porneste(() => mutaCategoria(categorie.id, -1))}
          cale="m6 15 6-6 6 6"
        />
        <Sageata
          eticheta={`Coboară ${categorie.nume}`}
          dezactivata={ultimul || seLucreaza}
          onClick={() => porneste(() => mutaCategoria(categorie.id, 1))}
          cale="m6 9 6 6 6-6"
        />
      </div>

      {deschis && (
        <div className="space-y-2.5 px-3.5 pb-3">
          <label className="block">
            <span className="eticheta">Nume</span>
            <input
              value={nume}
              onChange={(e) => setNume(e.target.value)}
              onBlur={() => {
                if (nume.trim() && nume.trim() !== categorie.nume) {
                  porneste(() => schimbaCategoria(categorie.id, { nume }));
                }
              }}
              className="camp mt-1"
              aria-label="Numele categoriei"
            />
          </label>

          <AlegeBuget
            valoare={categorie.categorieBuget === IMPLICIT ? "" : (categorie.categorieBuget ?? "")}
            dinBuget={dinBuget}
            onAlege={(v) => porneste(() => schimbaCategoria(categorie.id, { categorieBuget: v || null }))}
          />

          {confirmaScoaterea ? (
            <div className="rounded-xl bg-[var(--color-caramida-palid)] p-3">
              <p className="text-sm text-[#8c3626]">
                {categorie.produse === 0
                  ? "Scoți categoria?"
                  : `${categorie.produse === 1 ? "Produsul ei rămâne" : `Cele ${categorie.produse} produse rămân`} în catalog, fără categorie.`}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="buton buton-secundar buton-mic flex-1"
                  onClick={() => setConfirmaScoaterea(false)}
                >
                  Renunță
                </button>
                <button
                  type="button"
                  className="buton buton-mic buton-sters flex-1"
                  onClick={() => porneste(() => scoateCategoria(categorie.id))}
                >
                  Scoate categoria
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="buton buton-mic buton-sters"
              onClick={() => setConfirmaScoaterea(true)}
            >
              Scoate
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function AlegeBuget({
  valoare,
  dinBuget,
  onAlege,
}: {
  valoare: string;
  dinBuget: string[];
  onAlege: (valoare: string) => void;
}) {
  // O categorie de buget salvată care nu mai e în foaie rămâne în listă, ca să se vadă.
  const optiuni = valoare && !dinBuget.includes(valoare) ? [valoare, ...dinBuget] : dinBuget;

  return (
    <label className="block">
      <span className="eticheta">În buget la</span>
      <select value={valoare} onChange={(e) => onAlege(e.target.value)} className="camp mt-1">
        <option value="">{IMPLICIT} (implicit)</option>
        {optiuni
          .filter((o) => o !== IMPLICIT)
          .map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
      </select>
    </label>
  );
}

function Sageata({
  eticheta,
  dezactivata,
  onClick,
  cale,
}: {
  eticheta: string;
  dezactivata: boolean;
  onClick: () => void;
  cale: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={dezactivata}
      aria-label={eticheta}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-linie)] bg-white disabled:opacity-30"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={cale} />
      </svg>
    </button>
  );
}
