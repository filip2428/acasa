"use client";

import { useState, useTransition } from "react";

import type { PropunereaZilei } from "@/lib/domeniu";
import { cuDe } from "@/lib/formatare";

import { amanaPropunerea, punePropunereaInCalendar } from "./actiuni";

/*
  Singurul loc din aplicație care spune „fă asta acum”.

  Are voie s-o spună pentru că a citit calendarul: știe că e liber și cât e
  liber. De aceea propune și ora, nu doar treaba — o oră concretă e o decizie
  luată, „când ai timp” nu e.
*/

export default function Propunere({ propunere }: { propunere: PropunereaZilei }) {
  const [raspuns, setRaspuns] = useState<string | null>(null);
  const [plecat, setPlecat] = useState(false);
  const [lucreaza, porneste] = useTransition();

  if (plecat) return null;

  const { treaba, ora, esteMaine, stare } = propunere;
  const hotarat = stare === "acceptat";

  return (
    <section className="card intra p-4">
      <span className="eticheta">
        {hotarat ? "Ți-ai pus în calendar" : esteMaine ? "Mâine după-masă" : "După-masa asta"}
      </span>
      <p className="titlu mt-1 text-xl">{treaba.titlu}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-creion)]">
        {hotarat ? (
          <>
            La <span className="cifre">{ora}</span>, vreo{" "}
            {cuDe(treaba.minuteEstimate, "minute")}. {treaba.zona}.
          </>
        ) : (
          <>
            Ai liber de la <span className="cifre">{ora}</span> și îți ia vreo{" "}
            {cuDe(treaba.minuteEstimate, "minute")}. {treaba.zona}.
          </>
        )}
      </p>

      {hotarat ? null : raspuns ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-smalt-adanc)]">{raspuns}</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="buton buton-secundar buton-mic flex-1"
            disabled={lucreaza}
            onClick={() =>
              porneste(async () => {
                await amanaPropunerea(treaba.id);
                setPlecat(true);
              })
            }
          >
            Nu azi
          </button>
          <button
            type="button"
            className="buton buton-principal buton-mic flex-1"
            disabled={lucreaza}
            onClick={() =>
              porneste(async () => {
                setRaspuns(
                  await punePropunereaInCalendar({
                    sarcinaId: treaba.id,
                    titlu: treaba.titlu,
                    ziua: propunere.ziua,
                    ora,
                    minute: treaba.minuteEstimate,
                  }),
                );
              })
            }
          >
            Pune-o la {ora}
          </button>
        </div>
      )}
    </section>
  );
}
