import Link from "next/link";

import { lei, lunaInCuvinte } from "@/lib/formatare";

import { incarcaEconomii } from "./economii/incarca";
import { Bara, CardLegatura } from "./economii/ui";

/*
  Luna pe scurt și legătura spre economii — citite direct din foaie, sub
  formular, ca ecranul Bani să se deschidă imediat chiar dacă Google răspunde
  greu. Procentele sunt din venit, nu din cheltuieli.
*/

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default async function SumarLunii() {
  const { stare } = await incarcaEconomii();
  if (!stare) return null;
  const { sumar, fonduri, urgenta } = stare;
  const deMutat = fonduri.reduce((t, f) => t + f.deMutat, 0);
  const max = Math.max(1, ...sumar.grupe.map((g) => g.real));

  return (
    <>
      <section className="card intra p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="eticheta">{lunaInCuvinte(stare.luna)} pe scurt</h2>
          <span className="cifre text-sm">{lei(sumar.venitTotal, true)} venit</span>
        </div>
        {sumar.venitOcazional > 0 && (
          <p className="mt-0.5 text-xs text-[var(--color-creion)]">
            din care <span className="cifre">{lei(sumar.venitOcazional, true)}</span> ocazional
          </p>
        )}
        <ul className="mt-3 space-y-2.5">
          {sumar.grupe.map((g) => (
            <li key={g.tip}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>{g.eticheta}</span>
                <span className="cifre text-[var(--color-creion)]">
                  {lei(g.real, true)}{sumar.venitTotal > 0 && <> · {pct(g.procent)}</>}
                </span>
              </div>
              <div className="mt-1">
                <Bara procent={g.real / max} culoare={g.tip === "Fond" || g.tip === "Avere" ? "var(--color-smalt-viu)" : "var(--color-alama)"} />
              </div>
            </li>
          ))}
        </ul>
        <dl className="rupere mt-4 grid grid-cols-2 gap-2 pt-3 text-center">
          <div><dt className="text-xs text-[var(--color-creion)]">economisit</dt><dd className="titlu text-xl">{pct(sumar.rataEconomisire)}</dd></div>
          <div><dt className="text-xs text-[var(--color-creion)]">investit</dt><dd className="titlu text-xl">{pct(sumar.rataInvestire)}</dd></div>
        </dl>
        {sumar.platitDinEconomii > 0 && (
          <p className="mt-2 text-center text-xs text-[var(--color-creion)]">
            plus <span className="cifre">{lei(sumar.platitDinEconomii, true)}</span> plătiți din economii, în afara bugetului
          </p>
        )}
      </section>

      <CardLegatura
        href="/bani/economii"
        eticheta="Economii"
        titlu={lei(stare.total, true)}
        detaliu={[
          urgenta.luni != null ? `fond de urgență: ${urgenta.luni.toFixed(1).replace(".", ",")} luni` : null,
          deMutat > 0.5 ? `${lei(deMutat, true)} de mutat` : null,
        ].filter(Boolean).join(" · ")}
        dreapta={deMutat > 0.5 ? <span className="fisa fisa-alama">de mutat</span> : undefined}
      />

      <div className="grid grid-cols-2 gap-3">
        <Link href="/bani/ocazional" className="buton buton-secundar">Venit ocazional</Link>
        <Link href="/bani/economii/plata" className="buton buton-secundar">Plătesc din economii</Link>
      </div>
    </>
  );
}

export function SumarSeIncarca() {
  return (
    <section className="card p-4" aria-busy>
      <p className="eticheta">Luna pe scurt</p>
      <p className="mt-2 text-sm text-[var(--color-creion)]">Se citește foaia…</p>
    </section>
  );
}
