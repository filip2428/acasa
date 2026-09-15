/*
  Formatări folosite peste tot. Le ținem într-un singur loc ca „12,40 lei” să
  arate la fel în listă, pe card și în buget.
*/

const LEI = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const LEI_ROTUND = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });

/** „12,40 lei”. Pentru sume mari, fără zecimale: „1.240 lei”. */
export function lei(suma: number | null | undefined, rotund = false) {
  if (suma == null) return "—";
  return `${(rotund ? LEI_ROTUND : LEI).format(suma)} lei`;
}

/**
 * O sumă scrisă de mână: „12,40”, „12.40”, „ 12 ”. Tastatura numerică de pe
 * iPhone în română are doar virgulă, deci o primim la fel ca punctul. Null dacă
 * nu e un număr.
 */
export function citesteSuma(text: string) {
  const curat = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!curat) return null;
  const numar = Number(curat);
  return Number.isFinite(numar) ? Math.round(numar * 100) / 100 : null;
}

/** Suma în câmp, cu virgulă: 12.4 → „12,4”. */
export function sumaInCamp(suma: number | null | undefined) {
  return suma == null ? "" : String(suma).replace(".", ",");
}

/** Cantitatea fără zerouri inutile: „1 buc”, „0,5 kg”, „250 g”. */
export function cantitate(valoare: number, unitate: string) {
  const numar = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(valoare);
  return `${numar} ${unitate}`;
}

/*
  Româna cere „de” înaintea substantivului la numerele al căror rest la 100 e 0
  sau de la 20 în sus: 8 minute, dar 20 de minute; 101 minute, dar 120 de minute.
*/
export function cuDe(numar: number, substantiv: string) {
  const rest = Math.abs(numar) % 100;
  return `${numar}${rest === 0 || rest >= 20 ? " de" : ""} ${substantiv}`;
}

const ZILE = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
const LUNI = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

/*
  Ora României, oriunde ar rula codul.

  Pe Vercel serverul e pe UTC, deci `new Date().getHours()` dă vara cu trei ore
  mai puțin decât ceasul din bucătărie. Tot ce ține de „la ce oră” trece pe aici.
*/
const IN_ROMANIA = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function inRomania(d = new Date()) {
  const parti = IN_ROMANIA.formatToParts(d);
  const bucata = (tip: Intl.DateTimeFormatPartTypes) =>
    parti.find((p) => p.type === tip)?.value ?? "";

  const ora = Number(bucata("hour"));
  const minut = Number(bucata("minute"));

  return {
    ziua: `${bucata("year")}-${bucata("month")}-${bucata("day")}`,
    ora,
    minut,
    /** „15:30” */
    ceas: `${String(ora).padStart(2, "0")}:${String(minut).padStart(2, "0")}`,
    /** Minute de la miezul nopții — comod la comparat intervale. */
    minutDinZi: ora * 60 + minut,
  };
}

/*
  Zilele calendarului.

  O zi e text „AAAA-LL-ZZ” și e întotdeauna ziua din România. Același motiv ca
  mai sus: între miezul nopții și ora 3 (2 iarna), ceasul unui server pe UTC e
  încă în ziua de ieri — iar pe 1 ale lunii, în luna trecută, deci bugetul ar
  citi altă foaie.

  De asta „azi” pleacă din `inRomania()`, iar tot ce înseamnă „peste N zile” sau
  „luna viitoare” se socotește pe text, nu cu `setDate` pe ceasul mașinii.
  Momentul UTC din `caMoment` e doar o unealtă de numărat zile: nu are ore de
  vară, deci nu sare și nu se dublează nicio zi, oricare ar fi fusul mașinii.
*/

function caMoment(zi: string, zileInPlus = 0) {
  const [an, luna, ziua] = zi.split("-").map(Number);
  return Date.UTC(an, luna - 1, ziua + zileInPlus);
}

function caZi(moment: number) {
  const d = new Date(moment);
  const l = String(d.getUTCMonth() + 1).padStart(2, "0");
  const z = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${l}-${z}`;
}

/** Data de azi ca „AAAA-LL-ZZ”, în calendarul României. */
export function azi(acum = new Date()) {
  return inRomania(acum).ziua;
}

/** Luna curentă ca „AAAA-LL” — exact formatul foilor din Buget_Familial. */
export function lunaCurenta(acum = new Date()) {
  return azi(acum).slice(0, 7);
}

/** Ziua de peste `zile` zile (sau de acum atâtea, cu număr negativ). */
export function deplaseaza(zi: string, zile: number) {
  return caZi(caMoment(zi, zile));
}

/** Câte zile sunt de la `deLa` până la `panaLa`; negativ dacă `panaLa` e înainte. */
export function zileIntre(deLa: string, panaLa: string) {
  return Math.round((caMoment(panaLa) - caMoment(deLa)) / 86_400_000);
}

/** Câte zile are o lună „AAAA-LL”. */
export function zileInLuna(luna: string) {
  // Ziua 0 a lunii următoare e ultima zi a lunii acesteia.
  const [an, l] = luna.split("-").map(Number);
  return new Date(Date.UTC(an, l, 0)).getUTCDate();
}

/** Luna „AAAA-LL” de peste `deplasare` luni (sau de acum atâtea, cu număr negativ). */
export function lunaVecina(luna: string, deplasare: number) {
  const [an, l] = luna.split("-").map(Number);
  const index = an * 12 + (l - 1) + deplasare;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Adaugă luni la o dată, fără să sară peste sfârșitul lunii (31 ian + 1 lună = 28/29 feb). */
export function adaugaLuni(zi: string, luni: number) {
  const luna = lunaVecina(zi.slice(0, 7), luni);
  const ziua = Math.min(Number(zi.slice(8, 10)), zileInLuna(luna));
  return `${luna}-${String(ziua).padStart(2, "0")}`;
}

/** „joi, 10 septembrie” */
export function ziLunga(zi: string) {
  const d = new Date(caMoment(zi));
  return `${ZILE[d.getUTCDay()]}, ${d.getUTCDate()} ${LUNI[d.getUTCMonth()]}`;
}

/** „peste 3 zile”, „mâine”, „azi”, „acum 2 zile” */
export function candFataDeAzi(data: string, ziuaDeAzi = azi()) {
  const zile = zileIntre(ziuaDeAzi, data);

  if (zile === 0) return "azi";
  if (zile === 1) return "mâine";
  if (zile === -1) return "ieri";
  if (zile > 1) return `peste ${zile} zile`;
  return `acum ${Math.abs(zile)} zile`;
}

/**
 * Momentul exact în care ceasul din România arată `minutDinZi` în ziua `zi` —
 * pentru „diseară la 19” sau „mâine la 9”, oricare ar fi fusul serverului.
 */
export function momentInRomania(zi: string, minutDinZi: number) {
  const caPeCeas = caMoment(zi) + minutDinZi * 60_000;
  // Decalajul (2 sau 3 ore) se ia de două ori: a doua oară chiar în jurul
  // momentului găsit, ca să nimerească și zilele în care se schimbă ora.
  const decalaj = (moment: number) => {
    const acolo = inRomania(new Date(moment));
    return caMoment(acolo.ziua) + acolo.minutDinZi * 60_000 - moment;
  };
  const primaIncercare = caPeCeas - decalaj(caPeCeas);
  return new Date(caPeCeas - decalaj(primaIncercare));
}

/** „septembrie 2026” */
export function lunaInCuvinte(luna: string) {
  const [an, l] = luna.split("-").map(Number);
  return `${LUNI[l - 1]} ${an}`;
}
