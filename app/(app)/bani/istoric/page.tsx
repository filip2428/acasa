import Link from "next/link";

import Antet from "@/componente/Antet";
import { lei, lunaCurenta, lunaInCuvinte, lunaVecina, ziLunga } from "@/lib/formatare";
import { cheltuieliLunii } from "@/lib/servicii/buget";

export const metadata = { title: "Istoric — Acasă" };

/*
  Tot ce s-a trecut în buget din aplicație, lună cu lună.

  Pe ecranul Bani stă doar un card cu rezumatul; lista întreagă e aici, pe zile,
  ca să găsești repede „cât am dat marți la Lidl”. Luna stă în adresă, ca butonul
  „înapoi” al telefonului să facă ce trebuie.
*/

const LUNA_VALIDA = /^\d{4}-\d{2}$/;

export default async function PaginaIstoric({
  searchParams,
}: {
  searchParams: Promise<{ luna?: string }>;
}) {
  const { luna: lunaCeruta } = await searchParams;
  const lunaDeAcum = lunaCurenta();
  const luna =
    LUNA_VALIDA.test(lunaCeruta ?? "") && lunaCeruta! <= lunaDeAcum ? lunaCeruta! : lunaDeAcum;

  const cheltuieli = await cheltuieliLunii(luna);
  const total = cheltuieli.reduce((t, c) => t + c.suma, 0);

  const peZile: { zi: string; total: number; randuri: typeof cheltuieli }[] = [];
  for (const c of cheltuieli) {
    const ultima = peZile.at(-1);
    if (ultima?.zi === c.data) {
      ultima.randuri.push(c);
      ultima.total += c.suma;
    } else {
      peZile.push({ zi: c.data, total: c.suma, randuri: [c] });
    }
  }

  return (
    <main>
      <Antet
        supratitlu="Bani · Istoric"
        titlu={cheltuieli.length === 0 ? "Nimic trecut" : `${lei(total, true)} trecuți`}
        dreapta={
          cheltuieli.length > 0 ? (
            <span className="text-sm text-white/70">
              {cheltuieli.length === 1 ? "o cheltuială" : `${cheltuieli.length} cheltuieli`}
            </span>
          ) : null
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <nav className="card flex items-center justify-between gap-2 p-3">
          <Sageata luna={lunaVecina(luna, -1)} eticheta="Luna trecută">
            ‹
          </Sageata>
          <h2 className="titlu text-xl">{lunaInCuvinte(luna)}</h2>
          <Sageata
            luna={luna < lunaDeAcum ? lunaVecina(luna, 1) : null}
            eticheta="Luna următoare"
          >
            ›
          </Sageata>
        </nav>

        {cheltuieli.length === 0 ? (
          <p className="card p-4 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
            {luna === lunaDeAcum
              ? "Luna asta nu s-a trecut încă nimic din aplicație."
              : "În luna asta nu s-a trecut nimic din aplicație."}{" "}
            Ce s-a scris direct în foaie apare doar în totalurile de pe ecranul Bani.
          </p>
        ) : (
          peZile.map((zi) => (
            <section key={zi.zi}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
                <h3 className="eticheta">{ziLunga(zi.zi)}</h3>
                {zi.randuri.length > 1 && (
                  <span className="cifre text-xs text-[var(--color-creion)]">{lei(zi.total)}</span>
                )}
              </div>
              <ul className="card card-lipit overflow-hidden">
                {zi.randuri.map((c) => (
                  <li key={c.id} className="flex items-baseline gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem]">{c.categorie}</span>
                      <span className="block truncate text-xs text-[var(--color-creion)]">
                        {[
                          c.descriere,
                          c.sursa === "lista" ? "din listă" : null,
                          c.sursa === "bon" ? "de pe bon" : null,
                          c.cine,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {!c.trimisLa && <span className="fisa fisa-caramida shrink-0">netrimis</span>}
                    <span className="cifre shrink-0 text-sm">{lei(c.suma)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

function Sageata({
  luna,
  eticheta,
  children,
}: {
  luna: string | null;
  eticheta: string;
  children: React.ReactNode;
}) {
  const clase =
    "flex size-9 items-center justify-center rounded-lg border border-[var(--color-linie)] text-lg leading-none";

  if (!luna) {
    return (
      <span aria-hidden className={`${clase} opacity-30`}>
        {children}
      </span>
    );
  }

  return (
    <Link href={`/bani/istoric?luna=${luna}`} scroll={false} aria-label={eticheta} className={clase}>
      {children}
    </Link>
  );
}
