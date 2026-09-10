import Link from "next/link";

import Antet from "@/componente/Antet";
import { candFataDeAzi, lei, ziLunga } from "@/lib/formatare";
import { bugetulLunii } from "@/lib/servicii/buget";
import { evenimenteDeAnuntat } from "@/lib/servicii/calendar-casa";
import { ceExpira } from "@/lib/servicii/camara";
import { persoaneleCasei } from "@/lib/servicii/casa";
import { articoleleListei, listaCurenta, totaluri } from "@/lib/servicii/lista";
import { declutterulLunii, treburiScadente } from "@/lib/servicii/planificator";
import { propunereaZilei } from "@/lib/servicii/propuneri";
import { sesiuneCurenta } from "@/lib/sesiune";

import Propunere from "./Propunere";
import Reminder from "./Reminder";
import Treburi from "./Treburi";

/*
  „Azi” — ecranul de pornire.

  Regula lui: nimic care nu cere o decizie astăzi. Bugetul întreg stă în Bani,
  toate treburile stau în Casa; aici vine doar vârful.
*/

const CATEGORII_URMARITE = ["Mâncare", "Transport", "hobby", "Mâncare în oraș"];

export default async function PaginaAzi() {
  const sesiune = await sesiuneCurenta();

  const [lista, buget, treburi, declutter, persoane, expira, evenimente] = await Promise.all([
    listaCurenta(),
    bugetulLunii(),
    treburiScadente(),
    declutterulLunii(),
    persoaneleCasei(),
    ceExpira(3),
    evenimenteDeAnuntat(),
  ]);

  // Cu doi oameni în casă, „celălalt” e cel care nu sunt eu.
  const celalalt = persoane.find((p) => p.id !== sesiune?.persoanaId);

  // Propunerea se uită în calendarul celui logat, deci se cere abia după sesiune.
  const propunere = sesiune ? await propunereaZilei(sesiune.persoanaId) : null;

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
        {expira.length > 0 && (
          <Link href="/camara" className="card intra block p-4">
            <span className="eticheta">Din cămară</span>
            <p className="titlu mt-1 text-xl">
              {expira[0].zilePanaLaExpirare != null && expira[0].zilePanaLaExpirare < 0
                ? "A expirat ceva"
                : "Expiră curând"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-caramida)]">
              {expira
                .slice(0, 3)
                .map((r) => r.nume)
                .join(", ")}
              {expira.length > 3 ? ` și încă ${expira.length - 3}` : ""}
            </p>
          </Link>
        )}

        {evenimente.length > 0 && (
          <Link href="/casa/calendar" className="card block p-4">
            <span className="eticheta">Din calendar</span>
            <ul className="mt-2 space-y-1.5">
              {evenimente.slice(0, 3).map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[0.9375rem]">{e.titlu}</span>
                  <span
                    className={`shrink-0 text-xs ${
                      e.zilePanaLa != null && e.zilePanaLa < 0
                        ? "text-[var(--color-caramida)]"
                        : "text-[var(--color-creion)]"
                    }`}
                  >
                    {e.scadenta ? candFataDeAzi(e.scadenta) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Link>
        )}

        {propunere && <Propunere propunere={propunere} />}

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

        {celalalt && (
          <div className="pt-1">
            <Reminder catre={celalalt.id} numeleLui={celalalt.nume} />
          </div>
        )}
      </div>
    </main>
  );
}
