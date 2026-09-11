"use client";

import { usePathname } from "next/navigation";

/*
  Ce se vede în clipa în care apeși pe o secțiune, până vin datele.

  Fără fișierul ăsta, telefonul rămânea pe ecranul vechi până răspundea serverul
  — o secundă în care nu se întâmpla nimic, și exact asta se simțea ca „nu
  reacționează”. Acum atingerea schimbă ecranul pe loc: antetul de smalț cu numele
  secțiunii apare imediat, iar cardurile se umplu când sosesc.

  E componentă de client doar ca să știe pe ce secțiune a apăsat omul.
*/

const SECTIUNI: [prefix: string, nume: string][] = [
  ["/mese/retete", "Mese · Rețete"],
  ["/mese", "Mese"],
  ["/lista", "Cumpărături"],
  ["/camara", "Cămară"],
  ["/produse", "Catalog"],
  ["/casa/calendar", "Casa · Calendar"],
  ["/casa/zone", "Casa · Zone"],
  ["/casa/dorinte", "Casa · Dorințe"],
  ["/casa/bagaje", "Casa · Bagaje"],
  ["/casa", "Casa"],
  ["/bani", "Bani"],
  ["/setari", "Setări"],
];

export default function SeIncarca() {
  const cale = usePathname();
  const sectiune = cale === "/" ? "Azi" : SECTIUNI.find(([p]) => cale.startsWith(p))?.[1] ?? "";

  return (
    <main aria-busy="true" aria-label={`Se încarcă ${sectiune}`}>
      <header
        className="email buza rounded-b-[1.75rem] px-5 pb-9"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <p className="eticheta text-white/55">{sectiune}</p>
        <div className="schelet schelet-pe-smalt mt-2 h-7 w-44 rounded-lg" />
      </header>

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <div className="card p-4">
          <div className="schelet h-3 w-20 rounded" />
          <div className="schelet mt-3 h-5 w-52 rounded" />
          <div className="schelet mt-2 h-3 w-36 rounded" />
        </div>
        <div className="card p-4">
          <div className="schelet h-3 w-24 rounded" />
          <div className="schelet mt-3 h-4 w-full rounded" />
          <div className="schelet mt-2.5 h-4 w-11/12 rounded" />
          <div className="schelet mt-2.5 h-4 w-3/4 rounded" />
        </div>
        <div className="card p-4">
          <div className="schelet h-3 w-16 rounded" />
          <div className="schelet mt-3 h-5 w-40 rounded" />
        </div>
      </div>
    </main>
  );
}
