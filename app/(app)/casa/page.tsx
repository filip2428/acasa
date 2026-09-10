import Antet from "@/componente/Antet";
import { minutePeSaptamana, persoaneleCasei, zoneleCasei } from "@/lib/servicii/casa";

import Zone from "./Zone";

export const metadata = { title: "Casa — Acasă" };

export default async function PaginaCasa() {
  const [zone, persoane] = await Promise.all([zoneleCasei(), persoaneleCasei()]);
  const minute = minutePeSaptamana(zone);

  return (
    <main>
      <Antet
        supratitlu="Casa"
        titlu={zone.length === 1 ? "1 zonă" : `${zone.length} zone`}
        dreapta={
          minute > 0 ? (
            <span className="cifre text-sm text-white/70">
              ~{Math.round(minute / 60)}h / săpt.
            </span>
          ) : null
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <p className="px-1 text-sm leading-relaxed text-[var(--color-creion)]">
          Frecvențele sunt puncte de plecare, nu reguli — schimbă-le cum vă convine.
          Fiecare treabă se socotește de la ultima dată când a fost făcută, nu de la o
          zi fixă din calendar. Declutterul trece prin câte o zonă pe lună, în ordinea
          de aici.
        </p>

        <Zone zone={zone} persoane={persoane} />
      </div>
    </main>
  );
}
