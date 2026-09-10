import Link from "next/link";

import Antet from "@/componente/Antet";
import { culoareaPersoanei } from "@/lib/domeniu";
import { azi, lunaCurenta } from "@/lib/formatare";
import { lunaDinCalendar } from "@/lib/servicii/agenda";
import { calendarulCasei } from "@/lib/servicii/calendar-casa";

import Grila from "./Grila";
import Lista from "./Lista";

export const metadata = { title: "Calendar — Acasă" };

/*
  Calendarul are două vederi, pentru două întrebări diferite:

  - „Luna” răspunde la *când* — și, de când citim și calendarele Google, la
    „unde mai am o zi liberă”.
  - „Listă” răspunde la *ce urmează* — ITP-ul, revizia, controlul, pe categorii.

  Vederea și luna stau în adresă, nu în starea componentei: așa se poate trimite
  un link, iar butonul „înapoi” al telefonului face ce trebuie.
*/

const LUNA_VALIDA = /^\d{4}-\d{2}$/;

export default async function PaginaCalendar({
  searchParams,
}: {
  searchParams: Promise<{ luna?: string; vedere?: string }>;
}) {
  const { luna: lunaCeruta, vedere } = await searchParams;
  const ziuaDeAzi = azi();
  const luna = LUNA_VALIDA.test(lunaCeruta ?? "") ? lunaCeruta! : lunaCurenta();
  const esteLista = vedere === "lista";

  const [{ zile, agende }, evenimente] = await Promise.all([
    lunaDinCalendar(luna, ziuaDeAzi),
    calendarulCasei(ziuaDeAzi),
  ]);

  const oameni = agende.map((a, pozitie) => ({
    id: a.persoanaId,
    nume: a.nume,
    culoare: culoareaPersoanei(pozitie),
    areCalendar: Boolean(a.calendarId),
  }));

  const calendare = agende
    .filter((a) => a.calendarId)
    .map((a) => ({ persoanaId: a.persoanaId, nume: a.nume, calendarId: a.calendarId! }));

  const probleme = agende
    .filter((a) => a.eroare)
    .map((a) => ({ nume: a.nume, eroare: a.eroare! }));

  const apropiate = evenimente.filter(
    (e) => e.zilePanaLa != null && e.zilePanaLa <= e.remindereZileInainte,
  );

  return (
    <main>
      <Antet
        supratitlu="Casa · Calendar"
        titlu={
          apropiate.length === 0
            ? "Nimic urgent"
            : apropiate.length === 1
              ? "1 de rezolvat"
              : `${apropiate.length} de rezolvat`
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <nav className="flex gap-2">
          <Vedere href={`/casa/calendar?luna=${luna}`} activ={!esteLista}>
            Luna
          </Vedere>
          <Vedere href="/casa/calendar?vedere=lista" activ={esteLista}>
            Listă
          </Vedere>
        </nav>

        {esteLista ? (
          <Lista evenimente={evenimente} calendare={calendare} ziuaDeAzi={ziuaDeAzi} />
        ) : (
          <Grila
            key={luna}
            luna={luna}
            zile={zile}
            evenimente={evenimente}
            oameni={oameni}
            calendare={calendare}
            probleme={probleme}
            ziuaInitiala={
              zile.some((z) => z.ziua === ziuaDeAzi) ? ziuaDeAzi : `${luna}-01`
            }
            ziuaDeAzi={ziuaDeAzi}
          />
        )}
      </div>
    </main>
  );
}

function Vedere({
  href,
  activ,
  children,
}: {
  href: string;
  activ: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={activ ? "page" : undefined}
      className={`buton buton-mic flex-1 ${activ ? "buton-principal" : "buton-secundar"}`}
    >
      {children}
    </Link>
  );
}
