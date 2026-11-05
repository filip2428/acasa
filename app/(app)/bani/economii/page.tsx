import Link from "next/link";

import Antet from "@/componente/Antet";
import { lei, ziLunga } from "@/lib/formatare";
import { etichetaCont } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "./incarca";
import { Bara, CardLegatura, EroareFoaie, Sageata } from "./ui";

export const metadata = { title: "Economii — Acasă" };

/*
  Economiile, așa cum le arată foaia Economii: fiecare fond e suma conturilor cu
  acel „Scop”. De aici pleacă tot ce se făcea din meniul „💰 Economii”:
  transferurile lunii, mutările, conturile noi, scadențele, soldurile.
*/

export default async function PaginaEconomii() {
  const { stare, eroare } = await incarcaEconomii();
  const inapoi = { href: "/bani", eticheta: "Bani" };

  if (!stare) {
    return (
      <main>
        <Antet supratitlu="Bani · Economii" titlu="Economii" inapoi={inapoi} />
        <div className="mx-auto -mt-5 max-w-lg px-4"><EroareFoaie motiv={eroare} /></div>
      </main>
    );
  }

  const { fonduri, urgenta, cost, scadente, faraFond, rate, economii } = stare;
  const deMutat = fonduri.reduce((t, f) => t + f.deMutat, 0);
  const aproape = scadente.filter((c) => c.zile <= 30);
  const restRate = rate.reduce((t, r) => t + (r.rest ?? 0), 0);

  return (
    <main>
      <Antet supratitlu="Bani · Economii" titlu={`${lei(stare.total, true)}`} inapoi={inapoi}
        dreapta={<span className="text-sm text-white/70">în {economii.conturi.length} conturi</span>} />

      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        {/* Fondul de urgență */}
        <section className="card intra p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="eticheta">Fond de urgență</h2>
            <span className="cifre text-sm">{lei(urgenta.sold, true)}</span>
          </div>
          <p className="titlu mt-1 text-2xl">
            {urgenta.luni != null ? `${urgenta.luni.toFixed(1).replace(".", ",")} luni acoperite` : "—"}
          </p>
          {urgenta.luni != null && (
            <div className="mt-2">
              <Bara procent={urgenta.luni / urgenta.luniTinta} />
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-creion)]">
            {cost
              ? <>Ținta: {urgenta.luniTinta} luni × <span className="cifre">{lei(cost.cuTampon, true)}</span> (Esențiale + Rate, +25%) ={" "}
                <span className="cifre">{lei(urgenta.tinta, true)}</span>.
                {urgenta.tinta != null && urgenta.sold > urgenta.tinta * 1.15 &&
                  ` Ai cu ${lei(urgenta.sold - urgenta.tinta, true)} peste țintă — bani care pot lucra în alte fonduri sau în Investitii.`}</>
              : "Ținta se calculează din lunile încheiate."}
          </p>
        </section>

        {/* Ce e de mutat luna asta */}
        <CardLegatura
          href="/bani/economii/transferuri"
          eticheta="Transferurile lunii"
          titlu={deMutat > 0.5 ? `${lei(deMutat, true)} de mutat` : "Totul e mutat"}
          detaliu={deMutat > 0.5
            ? fonduri.filter((f) => f.deMutat > 0.5).map((f) => f.nume).join(", ")
            : "Planul de fonduri al lunii a ajuns în conturi"}
          dreapta={deMutat > 0.5 ? <span className="fisa fisa-alama">de făcut</span> : undefined}
        />

        {aproape.length > 0 && (
          <section>
            <h2 className="eticheta mb-1.5 px-1">Scadențe apropiate</h2>
            <ul className="card card-lipit overflow-hidden">
              {aproape.map((c) => (
                <li key={c.rand}>
                  <Link href={`/bani/economii/scadenta?cont=${c.rand}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem]">{etichetaCont(c)}</span>
                      <span className="block text-xs text-[var(--color-creion)]">{ziLunga(c.scadenta!)}</span>
                    </span>
                    <span className={`fisa shrink-0 ${c.zile < 0 ? "fisa-caramida" : c.zile <= 7 ? "fisa-alama" : ""}`}>
                      {c.zile < 0 ? `scadent de ${-c.zile} zile` : c.zile === 0 ? "azi" : `în ${c.zile} zile`}
                    </span>
                    <Sageata />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Fondurile */}
        <section>
          <h2 className="eticheta mb-1.5 px-1">Fonduri</h2>
          <ul className="card card-lipit overflow-hidden">
            {fonduri.map((f) => (
              <li key={f.nume}>
                <Link href={`/bani/economii/fond?nume=${encodeURIComponent(f.nume)}`} className="block px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[0.9375rem] font-semibold">{f.nume}</span>
                    <span className="cifre shrink-0 text-sm">{lei(f.inConturi, true)}</span>
                  </div>
                  {f.progres != null && (
                    <div className="mt-1.5"><Bara procent={f.progres} /></div>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-creion)]">
                    {f.tinta != null && <span>{Math.round((f.progres ?? 0) * 100)}% din {lei(f.tinta, true)}</span>}
                    {f.necesarPeLuna != null && f.necesarPeLuna > 0 && <span>· {lei(f.necesarPeLuna, true)}/lună</span>}
                    {f.deMutat > 0.5 && <span className="fisa fisa-alama">de mutat {lei(f.deMutat, true)}</span>}
                    {f.conturi.length === 0 && <span className="fisa fisa-caramida">fără cont</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {faraFond.length > 0 && (
          <section className="card p-4">
            <h2 className="eticheta">Conturi fără fond</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-creion)]">
              Au bani, dar „Scop”-ul lor nu e un fond. Pune-le scopul în foaia Economii, sau închide-le în alt cont.
            </p>
            <ul className="mt-2 space-y-1.5">
              {faraFond.map((c) => (
                <li key={c.rand} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{etichetaCont(c)} <span className="text-[var(--color-creion)]">({c.scop || "fără scop"})</span></span>
                  <span className="cifre shrink-0">{lei(c.soldLei, true)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Acțiunile din meniul „💰 Economii” */}
        <section className="grid grid-cols-2 gap-3">
          <Actiune href="/bani/economii/muta" titlu="Mută bani" detaliu="între conturi, și valută" />
          <Actiune href="/bani/economii/cont-nou" titlu="Deschide cont" detaliu="economii, depozit, titluri" />
          <Actiune href="/bani/economii/solduri" titlu="Actualizează soldurile" detaliu="toate odată" />
          <Actiune href="/bani/economii/scadenta" titlu="Scadență" detaliu="prelungește sau lichidează" />
          <Actiune href="/bani/economii/inchide" titlu="Închide cont" detaliu="sau vinde o investiție" />
          <Actiune href="/bani/ocazional" titlu="Venit ocazional" detaliu="cadouri, vânzări, bonusuri" />
        </section>

        {rate.length > 0 && (
          <section className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="eticheta">Rate</h2>
              {restRate > 0 && <span className="cifre text-sm">{lei(restRate, true)} de plătit</span>}
            </div>
            <ul className="mt-2 space-y-1.5">
              {rate.map((r) => (
                <li key={r.denumire} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{r.denumire}</span>
                  <span className="shrink-0 text-[var(--color-creion)]">
                    {r.rata > 0 && <span className="cifre">{lei(r.rata, true)}/lună</span>}
                    {r.ramase != null && <> · {r.ramase} rate</>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function Actiune({ href, titlu, detaliu }: { href: string; titlu: string; detaliu: string }) {
  return (
    <Link href={href} className="card flex min-h-[5.25rem] flex-col justify-between p-3.5">
      <span className="text-[0.9375rem] font-semibold leading-snug">{titlu}</span>
      <span className="text-xs text-[var(--color-creion)]">{detaliu}</span>
    </Link>
  );
}
