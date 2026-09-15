import Link from "next/link";

import Antet from "@/componente/Antet";
import { lei } from "@/lib/formatare";
import { categorieDinBuget } from "@/lib/servicii/buget";
import { areGoogle } from "@/lib/servicii/google";
import {
  articoleleListei,
  categoriileActive,
  listaCurenta,
  peCategorii,
  totaluri,
} from "@/lib/servicii/lista";

import Articol from "./Articol";
import CampAdaugare from "./CampAdaugare";
import Finalizare from "./Finalizare";

export const metadata = { title: "Listă — Acasă" };

export default async function PaginaLista() {
  const lista = await listaCurenta();
  const [articole, bugetMancare, categorii] = await Promise.all([
    articoleleListei(lista.id),
    categorieDinBuget("Mâncare"),
    categoriileActive(),
  ]);
  const grupe = peCategorii(articole);
  const sume = totaluri(articole);
  const alegeri = categorii.map((c) => ({ id: c.id, nume: c.nume }));

  const deBifat = articole.filter((a) => !a.bifat).length;

  return (
    <main>
      <Antet
        supratitlu="Cumpărături"
        titlu={deBifat > 0 ? `${deBifat} de luat` : "Lista e goală"}
        dreapta={
          <div className="flex items-center gap-1">
          <Link
            href="/camara"
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-white/75"
          >
            Cămară
          </Link>
          <Link
            href="/produse"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-white/75"
          >
            Catalog
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
          </div>
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        {/*
          Bonul. Numărul mare e cel care contează în momentul ăla: la începutul
          cumpărăturilor te interesează cât o să dai, iar din clipa în care începi
          să bifezi te interesează cât ai strâns deja în coș.
        */}
        <section className="card intra p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="eticheta">{sume.inCos > 0 ? "În coș" : "De luat"}</span>
            <span className="cifre text-[1.75rem] leading-none font-medium">
              {lei(sume.inCos > 0 ? sume.inCos : sume.total)}
            </span>
          </div>

          {sume.inCos > 0 && sume.ramas > 0 && (
            <div className="mt-2 flex items-baseline justify-between text-[var(--color-creion)]">
              <span className="text-sm">Rămâne de luat</span>
              <span className="cifre text-sm">{lei(sume.ramas)}</span>
            </div>
          )}

          {sume.faraPret > 0 && (
            <p className="mt-2 text-xs text-[var(--color-creion)]">
              {sume.faraPret === 1
                ? "Un articol n-are preț, deci nu intră în total."
                : `${sume.faraPret} articole n-au preț, deci nu intră în total.`}
            </p>
          )}

          {bugetMancare && (
            <div className="rupere mt-4 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm">
                  Buget <span className="text-[var(--color-creion)]">Mâncare</span>
                </span>
                <span
                  className={`cifre text-sm ${
                    bugetMancare.ramas - sume.inCos < 0 ? "text-[var(--color-caramida)]" : ""
                  }`}
                >
                  {lei(bugetMancare.ramas - sume.inCos, true)} rămân
                </span>
              </div>
              <BaraBuget
                consumat={bugetMancare.real + sume.inCos}
                planificat={bugetMancare.planificat}
              />
            </div>
          )}
        </section>

        <CampAdaugare />

        {grupe.length === 0 ? (
          <p className="px-1 py-8 text-center text-[0.9375rem] text-[var(--color-creion)]">
            Scrie mai sus ce vă trebuie. Dacă produsul e deja în catalog, îi vine
            prețul din urmă.
          </p>
        ) : (
          grupe.map((grupa) => (
            <section key={grupa.nume}>
              <h2 className="eticheta mb-1.5 px-1">{grupa.nume}</h2>
              <div className="card card-lipit overflow-hidden">
                {grupa.articole.map((articol) => (
                  <Articol key={articol.id} articol={articol} categorii={alegeri} />
                ))}
              </div>
            </section>
          ))
        )}

        {articole.length > 0 && <Finalizare total={sume.inCos} deBifat={deBifat} areBuget={areGoogle()} />}
      </div>
    </main>
  );
}

function BaraBuget({ consumat, planificat }: { consumat: number; planificat: number }) {
  if (planificat <= 0) return null;
  const procent = Math.min(100, Math.round((consumat / planificat) * 100));
  const depasit = consumat > planificat;

  return (
    <div
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-chit)]"
      role="img"
      aria-label={`${procent}% din bugetul lunii`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${procent}%`,
          backgroundColor: depasit ? "var(--color-caramida)" : "var(--color-smalt-viu)",
        }}
      />
    </div>
  );
}
