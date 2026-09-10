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

/** Cantitatea fără zerouri inutile: „1 buc”, „0,5 kg”, „250 g”. */
export function cantitate(valoare: number, unitate: string) {
  const numar = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(valoare);
  return `${numar} ${unitate}`;
}

const ZILE = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
const LUNI = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

/** „joi, 10 septembrie” */
export function ziLunga(d: Date) {
  return `${ZILE[d.getDay()]}, ${d.getDate()} ${LUNI[d.getMonth()]}`;
}

/** Data de azi ca „AAAA-LL-ZZ”, în ora locală (nu UTC — altfel seara sare o zi). */
export function azi(d = new Date()) {
  const l = String(d.getMonth() + 1).padStart(2, "0");
  const z = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${l}-${z}`;
}

/** Luna curentă ca „AAAA-LL” — exact formatul foilor din Buget_Familial. */
export function lunaCurenta(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** „peste 3 zile”, „mâine”, „azi”, „acum 2 zile” */
export function candFataDeAzi(data: string) {
  const tinta = new Date(`${data}T12:00:00`);
  const acum = new Date();
  acum.setHours(12, 0, 0, 0);
  const zile = Math.round((tinta.getTime() - acum.getTime()) / 86_400_000);

  if (zile === 0) return "azi";
  if (zile === 1) return "mâine";
  if (zile === -1) return "ieri";
  if (zile > 1) return `peste ${zile} zile`;
  return `acum ${Math.abs(zile)} zile`;
}
