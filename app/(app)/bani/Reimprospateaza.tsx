"use client";

import { useState, useTransition } from "react";

import { reimprospateazaBugetul } from "./actiuni";

/*
  Citirea din foaie, la cerere.

  Aplicația recitește singură bugetul când copia ei are mai mult de o jumătate de
  oră. Dacă tocmai ai scris ceva în foaie și vrei să-l vezi acum, apeși aici. Iar
  dacă nu merge, spune de ce — nu doar „n-a mers”.
*/

export default function Reimprospateaza({
  eticheta,
  mic = false,
}: {
  /** „citit acum 12 min” — calculat pe server, ca să nu difere ceasurile. */
  eticheta?: string;
  mic?: boolean;
}) {
  const [motiv, setMotiv] = useState<string | null>(null);
  const [lucreaza, porneste] = useTransition();

  function citeste() {
    porneste(async () => {
      setMotiv(null);
      const stare = await reimprospateazaBugetul();
      if (!stare.ok) setMotiv(stare.motiv);
    });
  }

  return (
    <div className={mic ? "text-right" : ""}>
      {mic ? (
        <button
          type="button"
          onClick={citeste}
          disabled={lucreaza}
          className="text-xs text-[var(--color-creion)]"
        >
          {lucreaza ? "citesc din foaie…" : (
            <>
              {eticheta ? `${eticheta} · ` : ""}
              <span className="underline">reîmprospătează</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={citeste}
          disabled={lucreaza}
          className="buton buton-secundar buton-mic w-full"
        >
          {lucreaza ? "Citesc din foaie…" : "Încearcă din nou"}
        </button>
      )}

      {motiv && (
        <p className="mt-2 rounded-xl bg-[var(--color-caramida-palid)] p-3 text-left text-sm leading-relaxed text-[#8c3626]">
          {motiv}
        </p>
      )}
    </div>
  );
}
