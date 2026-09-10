import Link from "next/link";

import Antet from "@/componente/Antet";
import { lei, ziLunga } from "@/lib/formatare";
import { bugetulLunii } from "@/lib/servicii/buget";
import { persoaneleCasei } from "@/lib/servicii/casa";
import { articoleleListei, listaCurenta, totaluri } from "@/lib/servicii/lista";
import { declutterulLunii, treburiScadente } from "@/lib/servicii/planificator";
import { sesiuneCurenta } from "@/lib/sesiune";

import Treburi from "./Treburi";

/*
  „Azi” — ecranul de pornire.

  Regula lui: nimic care nu cere o decizie astăzi. Bugetul întreg stă în Bani,
  toate treburile stau în Casa; aici vine doar vârful.
*/

const CATEGORII_URMARITE = ["Mâncare", "Transport", "hobby", "Mâncare în oraș"];

export default async function PaginaAzi() {
  const sesiune = await sesiuneCurenta();

  const [lista, buget, treburi, declutter, persoane] = await Promise.all([
    listaCurenta(),
    bugetulLunii(),
    treburiScadente(),
    declutterulLunii(),
    persoaneleCasei(),
  ]);

  const articole = await articoleleListei(lista.id);
  const sume = totaluri(articole);
  const deLuat = articole.filter((a) => !a.bifat);

  const urmarite = CATEGORII_URMARITE.map((nume) =>
    buget.find((r) => r.categorie.toLowerCase() === nume.toLowerCase()),
  ).filter((r) => r != null && r.planificat > 0);

  return (
    <main>
      <Antet supratitlu={ziLunga(new Date())} titlu={`Bună, ${sesiune?.nume ?? ""}`} />

      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <div className="intra">
          <Treburi
            treburi={treburi}
            declutter={declutter}
            persoane={persoane}
            eu={sesiune?.persoanaId ?? 0}
          />
        </div>

        <Link href="/lista" className="card block p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="eticheta">De cumpărat</span>
              <p className="titlu mt-1 text-xl">
                {deLuat.length === 0 ? "Nimic pe listă" : `${deLuat.length} lucruri`}
              </p>
              {deLuat.length > 0 && (
                <p className="mt-1 truncate text-sm text-[var(--color-creion)]">
                  {deLuat.slice(0, 4).map((a) => a.nume).join(", ")}
                  {deLuat.length > 4 ? "…" : ""}
                </p>
              )}
            </div>
            {sume.ramas > 0 && (
              <span className="cifre shrink-0 text-lg">{lei(sume.ramas, true)}</span>
            )}
          </div>
        </Link>

        {urmarite.length > 0 && (
          <Link href="/bani" className="card block p-4">
            <div className="flex items-baseline justify-between">
              <span className="eticheta">Bugetul lunii</span>
              <span className="text-xs text-[var(--color-creion)]">vezi tot</span>
            </div>

            <ul className="mt-3 space-y-3">
              {urmarite.map((rand) => (
                <li key={rand!.categorie}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">{rand!.categorie}</span>
                    <span
                      className={`cifre shrink-0 text-sm ${
                        rand!.ramas < 0
                          ? "text-[var(--color-caramida)]"
                          : "text-[var(--color-creion)]"
                      }`}
                    >
                      {rand!.ramas < 0
                        ? `${lei(Math.abs(rand!.ramas), true)} peste`
                        : `${lei(rand!.ramas, true)} rămân`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-chit)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((rand!.real / rand!.planificat) * 100))}%`,
                        backgroundColor:
                          rand!.ramas < 0 ? "var(--color-caramida)" : "var(--color-smalt-viu)",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Link>
        )}
      </div>
    </main>
  );
}
