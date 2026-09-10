"use client";

import { useState, useTransition } from "react";

import { trimiteReminder } from "./actiuni";

/*
  Un reminder pentru celălalt.

  Cazul real e „nu uita să iei pâine când vii” sau „sună-l pe instalator luni”.
  De asta momentele sunt scurtături — peste o oră, diseară, mâine dimineață — și
  abia la urmă o dată aleasă de mână. Nimeni nu vrea să umble prin calendar ca
  să-i spună celuilalt să scoată gunoiul.
*/

const CAND: [cheie: string, eticheta: string][] = [
  ["acum", "acum"],
  ["o-ora", "peste o oră"],
  ["diseara", "diseară la 19"],
  ["maine", "mâine la 9"],
];

export default function Reminder({
  catre,
  numeleLui,
}: {
  catre: number;
  numeleLui: string;
}) {
  const [deschis, setDeschis] = useState(false);
  const [text, setText] = useState("");
  const [cand, setCand] = useState("acum");
  const [raspuns, setRaspuns] = useState<string | null>(null);
  const [seTrimite, porneste] = useTransition();

  if (!deschis) {
    return (
      <button
        type="button"
        className="buton buton-secundar w-full"
        onClick={() => {
          setDeschis(true);
          setRaspuns(null);
        }}
      >
        Trimite-i un reminder lui {numeleLui}
      </button>
    );
  }

  return (
    <section className="card intra space-y-3 p-4">
      <h2 className="titlu text-lg">Reminder pentru {numeleLui}</h2>

      <label className="block">
        <span className="eticheta">Ce să-i amintesc</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="camp mt-1"
          placeholder="Ia pâine când vii"
          autoFocus
        />
      </label>

      <fieldset>
        <legend className="eticheta">Când</legend>
        <div className="-mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4 pb-1">
          {CAND.map(([cheie, eticheta]) => (
            <button
              key={cheie}
              type="button"
              onClick={() => setCand(cheie)}
              aria-pressed={cand === cheie}
              className={`buton buton-mic shrink-0 ${
                cand === cheie ? "buton-principal" : "buton-secundar"
              }`}
            >
              {eticheta}
            </button>
          ))}
        </div>
      </fieldset>

      {raspuns && (
        <p className="rounded-xl bg-[var(--color-smalt-palid)] px-3 py-2 text-sm text-[var(--color-smalt-adanc)]">
          {raspuns}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="buton buton-secundar flex-1"
          onClick={() => setDeschis(false)}
        >
          Renunță
        </button>
        <button
          type="button"
          className="buton buton-principal flex-1"
          disabled={seTrimite || text.trim() === ""}
          onClick={() =>
            porneste(async () => {
              const rezultat = await trimiteReminder(catre, text, cand);
              setText("");
              setRaspuns(rezultat);
            })
          }
        >
          {seTrimite ? "Se trimite…" : "Trimite"}
        </button>
      </div>
    </section>
  );
}
