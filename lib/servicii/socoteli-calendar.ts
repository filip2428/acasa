import type { EvenimentGoogle } from "@/lib/domeniu";
import { azi } from "@/lib/formatare";

/*
  Socotelile calendarului, scoase deoparte.

  Sunt două lucruri ușor de greșit și imposibil de verificat prin ecran: unde
  începe și unde se termină grila unei luni, și unde mai încape o treabă într-o
  zi deja ocupată. Fiind funcții pure, se pot proba cu `npm run proba` fără să
  atingem nici baza de date, nici Google.
*/

/** Ziua săptămânii, cu lunea pe 0 — cum se ține calendarul la noi. */
export function ziDinSaptamana(zi: string) {
  return (new Date(`${zi}T12:00:00`).getDay() + 6) % 7;
}

export function deplaseaza(zi: string, zile: number) {
  const d = new Date(`${zi}T12:00:00`);
  d.setDate(d.getDate() + zile);
  return azi(d);
}

/** Grila începe lunea dinaintea zilei de 1 și se termină duminica de după ultima zi. */
export function marginileGrilei(luna: string) {
  const [an, l] = luna.split("-").map(Number);
  const prima = `${luna}-01`;
  const ultima = azi(new Date(an, l, 0));

  return {
    prima,
    ultima,
    deLa: deplaseaza(prima, -ziDinSaptamana(prima)),
    panaLa: deplaseaza(ultima, 6 - ziDinSaptamana(ultima)),
  };
}

/** După-masa, așa cum o socotim noi: între 15:00 și 20:00. */
export const FEREASTRA = { de_la: 15 * 60, pana_la: 20 * 60 };

/**
 * Primul moment din fereastră în care încap `minute` fără să calce peste ceva.
 * Null dacă ziua e prea plină.
 *
 * `nuInainteDe` e ora la care ne uităm noi: pentru ziua de azi n-are rost să
 * propunem 15:00 când ceasul arată 15:20.
 *
 * Evenimentele marcate „Disponibil” în Google și cele de toată ziua nu ocupă
 * nimic: un „Ziua Anei” în calendar nu înseamnă că n-ai timp joi după-masă.
 */
export function candIncape(
  evenimente: EvenimentGoogle[],
  minute: number,
  nuInainteDe = 0,
) {
  const ocupate = evenimente
    .filter((e) => e.ocupa && !e.toataZiua && e.incepe != null)
    .map((e) => ({ de_la: e.incepe!, pana_la: e.seTermina ?? e.incepe! + 60 }))
    .sort((a, b) => a.de_la - b.de_la);

  let start = Math.max(FEREASTRA.de_la, nuInainteDe);

  for (const interval of ocupate) {
    if (interval.pana_la <= start) continue;
    if (interval.de_la >= start + minute) break; // e loc înainte de el
    start = interval.pana_la;
  }

  return start + minute <= FEREASTRA.pana_la ? start : null;
}

/** Sfertul de oră următor. Nimeni nu spune „ne apucăm la 15:07”. */
export function sfertulUrmator(minutDinZi: number) {
  return Math.ceil(minutDinZi / 15) * 15;
}

/** „17:30”, dintr-un minut al zilei. */
export function ceas(minutDinZi: number) {
  const ore = String(Math.floor(minutDinZi / 60)).padStart(2, "0");
  return `${ore}:${String(minutDinZi % 60).padStart(2, "0")}`;
}
