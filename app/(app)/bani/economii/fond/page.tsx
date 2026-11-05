import Link from "next/link";

import Antet from "@/componente/Antet";
import { lei, ziLunga } from "@/lib/formatare";
import { areScadenta, etichetaCont, FOND_URGENTA } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../incarca";
import { Bara, EroareFoaie } from "../ui";

import Tinta from "./Tinta";

export const metadata = { title: "Fond — Acasă" };

/*
  Un fond = conturile cu acel „Scop” în foaia Economii. Aici: soldul, ținta,
  conturile și ce poți face cu fiecare.
*/

export default async function PaginaFond({ searchParams }: { searchParams: Promise<{ nume?: string }> }) {
  const { nume } = await searchParams;
  const { stare, eroare } = await incarcaEconomii();
  const inapoi = { href: "/bani/economii", eticheta: "Economii" };
  const fond = stare?.fonduri.find((f) => f.nume === nume);
  if (!stare || !fond) {
    return (
      <main>
        <Antet supratitlu="Economii · Fond" titlu={nume ?? "Fond"} inapoi={inapoi} />
        <div className="mx-auto -mt-5 max-w-lg px-4">
          <EroareFoaie motiv={eroare ?? `Fondul „${nume}” nu e în bugetul lunii (categoriile de tip Fond și Avere).`} />
        </div>
      </main>
    );
  }

  const urgenta = fond.nume === FOND_URGENTA;
  return (
    <main>
      <Antet supratitlu={`Economii · ${fond.tip === "Avere" ? "Avere" : "Fond"}`} titlu={fond.nume} inapoi={inapoi}
        dreapta={<span className="cifre text-lg text-white">{lei(fond.inConturi, true)}</span>} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <section className="card intra space-y-3 p-4">
          {fond.tinta != null ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="eticheta">Țintă</span>
                <span className="cifre text-sm">{Math.round((fond.progres ?? 0) * 100)}% din {lei(fond.tinta, true)}</span>
              </div>
              <Bara procent={fond.progres ?? 0} />
              {fond.necesarPeLuna != null && fond.panaLa && (
                <p className="text-sm text-[var(--color-creion)]">
                  {fond.necesarPeLuna > 0
                    ? <>Ca să ajungi până pe {ziLunga(fond.panaLa)}: <span className="cifre text-[var(--color-cerneala)]">{lei(fond.necesarPeLuna, true)}</span> pe lună. Asta e suma de pus în plan.</>
                    : "Ținta e atinsă."}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--color-creion)]">Fără țintă. Pentru fondurile cu termen (nunți, concedii, mașină) merită una: îți spune cât să planifici lunar.</p>
          )}
          {urgenta
            ? <p className="text-xs text-[var(--color-creion)]">Ținta fondului de urgență vine automat din costul de bază (6 luni de Esențiale + Rate, +25%).</p>
            : <Tinta nume={fond.nume} tinta={fond.tinta} panaLa={fond.panaLa} />}
        </section>

        <section className="card p-4">
          <h2 className="eticheta">Luna asta</h2>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div><dt className="text-xs text-[var(--color-creion)]">plan</dt><dd className="cifre">{lei(fond.plan, true)}</dd></div>
            <div><dt className="text-xs text-[var(--color-creion)]">mutat</dt><dd className="cifre">{lei(fond.pus, true)}</dd></div>
            <div><dt className="text-xs text-[var(--color-creion)]">plătit din el</dt><dd className="cifre">{lei(fond.platit, true)}</dd></div>
          </dl>
          {fond.deMutat > 0.5 && (
            <Link href="/bani/economii/transferuri" className="buton buton-principal mt-3 w-full">Mută {lei(fond.deMutat, true)}</Link>
          )}
        </section>

        <section>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
            <h2 className="eticheta">Conturi</h2>
            <Link href={`/bani/economii/cont-nou?scop=${encodeURIComponent(fond.nume)}`} className="text-sm font-semibold text-[var(--color-smalt)]">+ cont nou</Link>
          </div>
          {fond.conturi.length === 0 ? (
            <p className="card p-4 text-sm leading-relaxed text-[var(--color-creion)]">
              Fondul n-are încă niciun cont. Deschide unul, sau pune „{fond.nume}” ca Scop la un cont existent în foaia Economii.
            </p>
          ) : (
            <ul className="space-y-3">
              {fond.conturi.map((c) => (
                <li key={c.rand} className="card p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-semibold">{etichetaCont(c)}</span>
                    <span className="cifre shrink-0">{lei(c.sold).replace(" lei", ` ${c.moneda}`)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-creion)]">
                    {[c.titular, c.dobanda > 0 ? `${(c.dobanda * 100).toFixed(2)}%` : null, c.scadenta ? `scadență ${ziLunga(c.scadenta)}` : c.lichiditate]
                      .filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!areScadenta(c) && <Link href={`/bani/economii/muta?spre=${c.rand}`} className="buton buton-secundar buton-mic">Pune bani</Link>}
                    {!areScadenta(c) && <Link href={`/bani/economii/muta?din=${c.rand}`} className="buton buton-secundar buton-mic">Scoate bani</Link>}
                    {areScadenta(c) && <Link href={`/bani/economii/scadenta?cont=${c.rand}`} className="buton buton-secundar buton-mic">Scadență</Link>}
                    <Link href={`/bani/economii/inchide?cont=${c.rand}`} className="buton buton-sters buton-mic">Închide</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
