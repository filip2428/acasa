/*
  Vocabularul comun al aplicației: liste de valori și forme de date pe care le
  folosesc și serverul, și ecranele.

  Fișierul ăsta n-are „server-only” și nu atinge baza de date — tocmai de asta
  există. Serviciile din `lib/servicii/` sunt server-only, iar dacă o componentă
  de client ar importa o constantă din ele, ar trage după ea tot driverul de bază
  de date și build-ul ar pica.
*/

/* ------------------------------------------------------------- cămara */

export const LOCURI = [
  { valoare: "camara", eticheta: "Cămară" },
  { valoare: "frigider", eticheta: "Frigider" },
  { valoare: "congelator", eticheta: "Congelator" },
] as const;

export function etichetaLocului(valoare: string) {
  return LOCURI.find((l) => l.valoare === valoare)?.eticheta ?? valoare;
}

export type RandStoc = {
  id: number;
  produsId: number;
  nume: string;
  categorie: string | null;
  cantitate: number;
  unitate: string;
  loc: string;
  expiraLa: string | null;
  adaugatLa: string;
  pozaUrl: string | null;
  /** Câte zile mai are. Negativ = a expirat. */
  zilePanaLaExpirare: number | null;
};

/* --------------------------------------------------- calendarul casei */

export const CATEGORII_CALENDAR = [
  { valoare: "masina", eticheta: "Mașină" },
  { valoare: "casa", eticheta: "Casă" },
  { valoare: "sanatate", eticheta: "Sănătate" },
  { valoare: "documente", eticheta: "Documente" },
  { valoare: "altele", eticheta: "Altele" },
] as const;

export function etichetaCategoriei(valoare: string) {
  return CATEGORII_CALENDAR.find((c) => c.valoare === valoare)?.eticheta ?? "Altele";
}

export type EvenimentAfisat = {
  id: number;
  titlu: string;
  categorie: string;
  /** Data la care e de făcut. Calculată, dacă evenimentul se repetă. */
  scadenta: string | null;
  recurentaLuni: number | null;
  ultimaEfectuareLa: string | null;
  remindereZileInainte: number;
  notite: string | null;
  /** Câte zile mai sunt. Negativ = a trecut. */
  zilePanaLa: number | null;
};

export type DateEveniment = {
  id?: number;
  titlu: string;
  categorie: string;
  data: string | null;
  recurentaLuni: number | null;
  remindereZileInainte: number;
  notite: string | null;
};

/* ------------------------------------------------------------ treburi */

export type TreabaScadenta = {
  id: number;
  titlu: string;
  zona: string;
  minuteEstimate: number;
  efort: string;
  atribuitLui: number | null;
  /** Câte zile au trecut peste termen. 0 = fix azi. */
  intarziere: number;
  evitaLaMenstruatie: boolean;
};

export type DeclutterulLunii = {
  zonaId: number;
  zona: string;
  sarcinaId: number | null;
  facut: boolean;
};
