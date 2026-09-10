import Link from "next/link";

import Antet from "@/componente/Antet";
import { lei, ziLunga } from "@/lib/formatare";
import { bugetulLunii } from "@/lib/servicii/buget";
import { articoleleListei, listaCurenta, totaluri } from "@/lib/servicii/lista";
import { sesiuneCurenta } from "@/lib/sesiune";

/*
  „Azi” — ecranul de pornire.

  Deocamdată arată cumpărăturile și bugetul. Pe măsură ce vin etapele următoare,
  aici urcă și treburile propuse pentru azi, mesele planificate și ce expiră.
  Regula ecranului: nimic care nu cere o decizie astăzi.
*/

const CATEGORII_URMARITE = ["Mâncare", "Curatenie", "Igiena", "Transport"];

export default async function PaginaAzi() {
  const sesiune = await sesiuneCurenta();
  const lista = await listaCurenta();
  const articole = await articoleleListei(lista.id);
  const sume = totaluri(articole);
  const buget = await bugetulLunii();

  const deLuat = articole.filter((a) => !a.bifat);
  const urmarite = CATEGORII_URMARITE.map((nume) =>
    buget.find((r) => r.categorie.toLowerCase() === nume.toLowerCase()),
  ).filter((r) => r != null && r.planificat > 0);

  return (
    <main>
      <Antet supratitlu={ziLunga(new Date())} titlu={`Bună, ${sesiune?.nume ?? ""}`} />

      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <Link href="/lista" className="card intra block p-4">
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
          <section className="card p-4">
            <div className="flex items-baseline justify-between">
              <span className="eticheta">Bugetul lunii</span>
              <span className="text-xs text-[var(--color-creion)]">din Buget_Familial</span>
            </div>

            <ul className="mt-3 space-y-3">
              {urmarite.map((rand) => (
                <li key={rand!.categorie}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm">{rand!.categorie}</span>
                    <span
                      className={`cifre text-sm ${
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
          </section>
        )}

        <p className="px-2 pt-2 text-center text-xs leading-relaxed text-[var(--color-creion)]">
          Urmează cămara, mesele și treburile casei.
        </p>
      </div>
    </main>
  );
}
