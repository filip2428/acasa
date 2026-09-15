"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import type { Categorie } from "@/lib/db/schema";
import { lei } from "@/lib/formatare";
import type { ProdusDinCatalog } from "@/lib/servicii/produse";

import { scaneazaCod } from "./actiuni";
import FisaProdus, { schitaDin, type Schita } from "./FisaProdus";
import Scaner from "./Scaner";

const SCHITA_GOALA: Schita = {
  nume: "",
  categorieId: null,
  unitate: "buc",
  cantitateImplicita: 1,
  codBare: null,
  pozaUrl: null,
  pret: null,
  zileValabilitate: null,
};

export default function Catalog({
  produse,
  categorii,
}: {
  produse: ProdusDinCatalog[];
  categorii: Categorie[];
}) {
  const [termen, setTermen] = useState("");
  const [scanerDeschis, setScanerDeschis] = useState(false);
  const [schita, setSchita] = useState<Schita | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [seCauta, porneste] = useTransition();

  const gasite = useMemo(() => {
    const curat = termen.trim().toLowerCase();
    if (!curat) return produse;
    return produse.filter(
      (p) => p.nume.toLowerCase().includes(curat) || p.codBare?.includes(curat),
    );
  }, [produse, termen]);

  function primesteCod(cod: string) {
    setScanerDeschis(false);
    porneste(async () => {
      const rezultat = await scaneazaCod(cod);

      if (rezultat.fel === "existent") {
        const existent = produse.find((p) => p.id === rezultat.produsId);
        if (existent) setSchita(schitaDin(existent));
        setMesaj(`„${rezultat.nume}” e deja în catalog.`);
        return;
      }

      if (rezultat.fel === "gasit") {
        setSchita({
          ...SCHITA_GOALA,
          nume: rezultat.nume,
          codBare: rezultat.codBare,
          pozaUrl: rezultat.pozaUrl,
        });
        setMesaj(null);
        return;
      }

      setSchita({ ...SCHITA_GOALA, codBare: rezultat.codBare });
      setMesaj("Produsul nu e în baza publică. Completează-l tu o dată.");
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <input
          value={termen}
          onChange={(e) => setTermen(e.target.value)}
          className="camp flex-1"
          placeholder="Caută în catalog…"
          aria-label="Caută în catalog"
        />
        <button
          type="button"
          onClick={() => setScanerDeschis(true)}
          className="buton buton-secundar px-3"
          aria-label="Scanează un cod de bare"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
            <path d="M3 7V5.5A2.5 2.5 0 0 1 5.5 3H7M17 3h1.5A2.5 2.5 0 0 1 21 5.5V7M21 17v1.5a2.5 2.5 0 0 1-2.5 2.5H17M7 21H5.5A2.5 2.5 0 0 1 3 18.5V17" />
            <path d="M7 8v8M10.5 8v8M14 8v8M17 8v8" />
          </svg>
        </button>
      </div>

      {mesaj && (
        <p className="rounded-xl bg-[var(--color-alama-palid)] px-3 py-2 text-sm text-[#7a5626]">
          {mesaj}
        </p>
      )}

      {seCauta && (
        <p className="text-center text-sm text-[var(--color-creion)]">Se caută produsul…</p>
      )}

      {gasite.length === 0 ? (
        <p className="py-8 text-center text-[0.9375rem] text-[var(--color-creion)]">
          {produse.length === 0
            ? "Catalogul e gol. Scanează primul produs sau adaugă-l de mână."
            : "Niciun produs care să se potrivească."}
        </p>
      ) : (
        <ul className="card card-lipit overflow-hidden">
          {gasite.map((produs) => (
            <li key={produs.id}>
              <button
                type="button"
                onClick={() => {
                  setSchita(schitaDin(produs));
                  setMesaj(null);
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
              >
                {produs.pozaUrl ? (
                  <Image
                    src={produs.pozaUrl}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="size-9 shrink-0 rounded-lg bg-[var(--color-chit)] object-contain"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-smalt-palid)] text-sm font-semibold text-[var(--color-smalt)]"
                  >
                    {produs.nume.slice(0, 1).toUpperCase()}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem]">{produs.nume}</span>
                  {produs.categorieNume && (
                    <span className="text-xs text-[var(--color-creion)]">
                      {produs.categorieNume}
                    </span>
                  )}
                </span>

                <span className="cifre shrink-0 text-sm text-[var(--color-creion)]">
                  {produs.pretUltim != null ? lei(produs.pretUltim) : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => {
          setSchita(SCHITA_GOALA);
          setMesaj(null);
        }}
        className="buton buton-principal w-full"
      >
        Adaugă un produs
      </button>

      <Link href="/produse/categorii" className="buton buton-secundar w-full">
        Categorii ({categorii.length})
      </Link>

      <Scaner
        deschis={scanerDeschis}
        laCod={primesteCod}
        laInchidere={() => setScanerDeschis(false)}
      />

      {schita && (
        <FisaProdus
          schita={schita}
          categorii={categorii}
          laInchidere={() => setSchita(null)}
        />
      )}
    </>
  );
}
