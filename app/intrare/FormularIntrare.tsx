"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { intra, type StareIntrare } from "./actiuni";

export default function FormularIntrare() {
  const [stare, actiune] = useActionState<StareIntrare, FormData>(intra, {});

  return (
    <form action={actiune} className="space-y-4">
      <div>
        <label htmlFor="cod" className="eticheta">
          Codul tău
        </label>
        <input
          id="cod"
          name="cod"
          className="camp cifre mt-2 text-center text-lg tracking-[0.2em] uppercase"
          placeholder="ABCD-EFGHJK"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={11}
          required
          aria-describedby={stare.eroare ? "eroare-cod" : undefined}
        />
      </div>

      {/* Capcană pentru boți: ascunsă de oameni, vizibilă pentru scripturi. */}
      <div aria-hidden className="absolute h-px w-px overflow-hidden opacity-0">
        <label htmlFor="telefon">Telefon</label>
        <input id="telefon" name="telefon" tabIndex={-1} autoComplete="off" />
      </div>

      {stare.eroare && (
        <p
          id="eroare-cod"
          role="alert"
          className="rounded-xl bg-[var(--color-caramida-palid)] px-3 py-2 text-sm text-[#8c3626]"
        >
          {stare.eroare}
        </p>
      )}

      <Buton />
    </form>
  );
}

function Buton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="buton buton-principal w-full" disabled={pending}>
      {pending ? "Se verifică…" : "Intră"}
    </button>
  );
}
