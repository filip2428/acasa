"use client";

import { useState, useTransition } from "react";

import { adaugaCategorie } from "@/app/(app)/produse/actiuni";

/*
  Alegerea categoriei, cu „categorie nouă” chiar în listă.

  Îți dai seama că lipsește o categorie exact când pui produsul undeva — în fișa
  lui sau pe listă, în magazin. Așa că o faci pe loc, fără să pleci din ecran.
*/

const NOUA = "__noua";

type CategorieMica = { id: number; nume: string };

export default function AlegeCategoria({
  categorii,
  valoare,
  onAlege,
  className = "camp",
  eticheta = "Categorie",
}: {
  categorii: CategorieMica[];
  valoare: number | null;
  onAlege: (categorieId: number | null) => void;
  className?: string;
  eticheta?: string;
}) {
  // Cele făcute aici apar imediat, fără să așteptăm reîmprospătarea paginii.
  const [facuteAici, setFacuteAici] = useState<CategorieMica[]>([]);
  const [scrie, setScrie] = useState(false);
  const [nume, setNume] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [seFace, porneste] = useTransition();

  const toate = [...categorii, ...facuteAici.filter((n) => !categorii.some((c) => c.id === n.id))];

  function fa() {
    const curat = nume.trim();
    if (!curat) return;
    porneste(async () => {
      try {
        const noua = await adaugaCategorie(curat);
        setFacuteAici((f) => [...f, { id: noua.id, nume: noua.nume }]);
        onAlege(noua.id);
        setNume("");
        setScrie(false);
        setEroare(null);
      } catch {
        setEroare("N-am putut face categoria. Încearcă din nou.");
      }
    });
  }

  if (scrie) {
    return (
      <div>
        <div className="flex gap-2">
          <input
            value={nume}
            onChange={(e) => setNume(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                fa();
              }
              if (e.key === "Escape") setScrie(false);
            }}
            className={`${className} min-w-0 flex-1`}
            placeholder="Animale, Bebe, Farmacie…"
            aria-label="Numele categoriei noi"
            autoFocus
            enterKeyHint="done"
          />
          <button
            type="button"
            onClick={fa}
            disabled={seFace || !nume.trim()}
            className="buton buton-principal buton-mic shrink-0"
          >
            {seFace ? "…" : "Adaugă"}
          </button>
          <button
            type="button"
            onClick={() => {
              setScrie(false);
              setEroare(null);
            }}
            className="buton buton-secundar buton-mic shrink-0"
            aria-label="Renunță la categoria nouă"
          >
            ✕
          </button>
        </div>
        {eroare && <p className="mt-1 text-xs text-[var(--color-caramida)]">{eroare}</p>}
      </div>
    );
  }

  return (
    <select
      value={valoare ?? ""}
      onChange={(e) => {
        if (e.target.value === NOUA) {
          setScrie(true);
          return;
        }
        onAlege(e.target.value ? Number(e.target.value) : null);
      }}
      className={className}
      aria-label={eticheta}
    >
      <option value="">Fără categorie</option>
      {toate.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nume}
        </option>
      ))}
      <option value={NOUA}>+ Categorie nouă…</option>
    </select>
  );
}
