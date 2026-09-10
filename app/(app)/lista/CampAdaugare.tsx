"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { lei } from "@/lib/formatare";

import { adaugaArticol, cauta } from "./actiuni";

type Sugestie = {
  id: number;
  nume: string;
  unitate: string;
  cantitateImplicita: number;
  pretUltim: number | null;
  pozaUrl: string | null;
};

/*
  Câmpul de adăugare caută în catalog în timp ce scrii, dar nu te obligă să
  găsești ceva: dacă apeși Enter fără să alegi, articolul intră ca text simplu.
  Adăugarea rapidă e mai importantă decât un catalog curat — catalogul se
  curăță după, din ecranul Produse.
*/

export default function CampAdaugare() {
  const [termen, setTermen] = useState("");
  const [sugestii, setSugestii] = useState<Sugestie[]>([]);
  const [seTrimite, porneste] = useTransition();
  const camp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const curat = termen.trim();
    if (curat.length < 2) {
      setSugestii([]);
      return;
    }
    // Așteptăm o pauză în tastare ca să nu trimitem o căutare la fiecare literă.
    const ceas = setTimeout(() => {
      cauta(curat).then(setSugestii).catch(() => setSugestii([]));
    }, 180);
    return () => clearTimeout(ceas);
  }, [termen]);

  function adauga(intrare: Parameters<typeof adaugaArticol>[0]) {
    porneste(async () => {
      await adaugaArticol(intrare);
      setTermen("");
      setSugestii([]);
      camp.current?.focus();
    });
  }

  /*
    Enter alege produsul din catalog, dacă există unul potrivit.

    Dacă sugestiile n-au apucat să vină — semnal slab în magazin, ai tastat și ai
    apăsat imediat — mai întrebăm o dată și abia apoi decidem. Altfel produsul ar
    intra ca text simplu și ar pierde prețul, adică exact ce strică totalul coșului.
  */
  async function trimite() {
    const curat = termen.trim();
    if (!curat) return;

    let potrivite = sugestii;
    if (potrivite.length === 0 && curat.length >= 2) {
      potrivite = await cauta(curat).catch(() => []);
    }

    const potrivit = potrivite.find((s) => s.nume.toLowerCase().startsWith(curat.toLowerCase()));
    if (potrivit) {
      adauga({ produsId: potrivit.id, cantitate: potrivit.cantitateImplicita });
    } else {
      adauga({ text: curat });
    }
  }

  const areText = termen.trim().length > 0;

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void trimite();
        }}
      >
        <input
          ref={camp}
          value={termen}
          onChange={(e) => setTermen(e.target.value)}
          className="camp pr-11"
          placeholder="Adaugă pe listă…"
          enterKeyHint="done"
          autoComplete="off"
          aria-label="Adaugă pe listă"
        />
        <button
          type="submit"
          disabled={!areText || seTrimite}
          aria-label="Adaugă"
          className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[var(--color-smalt)] text-white disabled:opacity-30"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </form>

      {areText && (
        <ul className="card absolute inset-x-0 top-[3.25rem] z-30 overflow-hidden">
          {sugestii.map((s) => (
            <li key={s.id} className="border-b border-[var(--color-linie)] last:border-0">
              <button
                type="button"
                onClick={() => adauga({ produsId: s.id, cantitate: s.cantitateImplicita })}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{s.nume}</span>
                {s.pretUltim != null && (
                  <span className="cifre shrink-0 text-xs text-[var(--color-creion)]">
                    {lei(s.pretUltim)}
                  </span>
                )}
              </button>
            </li>
          ))}
          <li className="border-t border-[var(--color-linie)]">
            <button
              type="button"
              onClick={() => adauga({ text: termen })}
              className="w-full px-3.5 py-2.5 text-left text-[0.9375rem] text-[var(--color-creion)]"
            >
              Adaugă „{termen.trim()}” ca text
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
