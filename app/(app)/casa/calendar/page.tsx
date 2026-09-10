import Antet from "@/componente/Antet";
import { calendarulCasei } from "@/lib/servicii/calendar-casa";

import Calendar from "./Calendar";

export const metadata = { title: "Calendar — Acasă" };

export default async function PaginaCalendar() {
  const evenimente = await calendarulCasei();
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
        <Calendar evenimente={evenimente} />
      </div>
    </main>
  );
}
