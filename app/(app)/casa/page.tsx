import Link from "next/link";

import Antet from "@/componente/Antet";
import { candFataDeAzi } from "@/lib/formatare";
import { calendarulCasei } from "@/lib/servicii/calendar-casa";
import { minutePeSaptamana, zoneleCasei } from "@/lib/servicii/casa";
import { db } from "@/lib/db";
import { dorinte } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Casa — Acasă" };

/*
  „Casa” adună tot ce ține de casă și nu e nici mâncare, nici bani: zonele și
  treburile, calendarul cu ITP-uri și revizii, ce vrem să cumpărăm cândva și
  șabloanele de bagaje.
*/

export default async function PaginaCasa() {
  const [zone, calendar, dorinteDeschise] = await Promise.all([
    zoneleCasei(),
    calendarulCasei(),
    db.select().from(dorinte).where(eq(dorinte.stare, "idee")),
  ]);

  const minute = minutePeSaptamana(zone);
  const urmatorul = calendar.find((e) => e.zilePanaLa != null);

  return (
    <main>
      <Antet supratitlu="Casa" titlu="Ce ține de casă" />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <Card
          href="/casa/zone"
          eticheta="Zone și treburi"
          titlu={zone.length === 1 ? "1 zonă" : `${zone.length} zone`}
          detaliu={minute > 0 ? `~${Math.round(minute / 60)} ore pe săptămână` : undefined}
        />

        <Card
          href="/casa/calendar"
          eticheta="Calendar"
          titlu={
            urmatorul
              ? urmatorul.titlu
              : calendar.length > 0
                ? "Nimic cu dată"
                : "Gol deocamdată"
          }
          detaliu={
            urmatorul?.scadenta
              ? `${candFataDeAzi(urmatorul.scadenta)}${
                  calendar.length > 1 ? ` · și încă ${calendar.length - 1}` : ""
                }`
              : "ITP, revizii, documente care expiră"
          }
          atentie={urmatorul != null && urmatorul.zilePanaLa != null && urmatorul.zilePanaLa < 0}
        />

        <Card
          href="/casa/dorinte"
          eticheta="Dorințe"
          titlu={
            dorinteDeschise.length === 0
              ? "Nimic pe listă"
              : dorinteDeschise.length === 1
                ? "1 lucru"
                : `${dorinteDeschise.length} lucruri`
          }
          detaliu="Ce vrem pentru casă, cândva"
        />

        <Card
          href="/casa/bagaje"
          eticheta="Bagaje"
          titlu="Șabloane"
          detaliu="Liste refolosibile pentru plecări"
        />
      </div>
    </main>
  );
}

function Card({
  href,
  eticheta,
  titlu,
  detaliu,
  atentie,
}: {
  href: string;
  eticheta: string;
  titlu: string;
  detaliu?: string;
  atentie?: boolean;
}) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-4">
      <span className="min-w-0 flex-1">
        <span className="eticheta">{eticheta}</span>
        <span className="titlu mt-1 block truncate text-xl">{titlu}</span>
        {detaliu && (
          <span
            className={`mt-0.5 block truncate text-sm ${
              atentie ? "text-[var(--color-caramida)]" : "text-[var(--color-creion)]"
            }`}
          >
            {detaliu}
          </span>
        )}
      </span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-creion)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
