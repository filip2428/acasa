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
  /** Calendarul Google în care e oglindit, dacă cineva a cerut asta. */
  googleCalendarId: string | null;
};

export type DateEveniment = {
  id?: number;
  titlu: string;
  categorie: string;
  data: string | null;
  recurentaLuni: number | null;
  remindereZileInainte: number;
  notite: string | null;
  /**
   * Calendarul Google în care să apară și el, dacă cineva a cerut asta explicit.
   * Null înseamnă „rămâne doar în aplicație” — și ăsta e felul implicit.
   */
  googleCalendarId: string | null;
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

/* ------------------------------------------------- calendarul Google */

export type EvenimentGoogle = {
  id: string;
  /** Id-ul din Google. La cele de toată ziua, `id` are lipită și ziua. */
  idGoogle: string;
  titlu: string;
  /** Ziua în care începe, „AAAA-LL-ZZ”, în ora României. */
  ziua: string;
  toataZiua: boolean;
  /** „15:00”, sau null dacă ține toată ziua. */
  ora: string | null;
  oraSfarsit: string | null;
  /** Minutul din zi la care începe și se termină — folosit la găsit ferestre libere. */
  incepe: number | null;
  seTermina: number | null;
  /** Evenimentele marcate „Disponibil” în Google nu ocupă ziua. */
  ocupa: boolean;
};

export type AgendaPersoanei = {
  persoanaId: number;
  nume: string;
  calendarId: string | null;
  evenimente: EvenimentGoogle[];
  /** Ce s-a stricat, spus pe românește. Null dacă totul e în regulă. */
  eroare: string | null;
};

/* --------------------------------------------------- propunerea zilei */

export type PropunereaZilei = {
  ziua: string;
  esteMaine: boolean;
  /** Ora la care încape, ca „17:30”. */
  ora: string;
  treaba: TreabaScadenta;
  /**
   * „propus” cere un răspuns; „acceptat” e ce ai hotărât deja azi și rămâne pe
   * ecran până seara, ca să vezi la ce te-ai înhămat. Refuzul scoate cardul cu
   * totul — asta a și cerut omul.
   */
  stare: "propus" | "acceptat";
};

/* ------------------------------------------------------- ziua din calendar */

export type IntrareZi =
  | { fel: "eveniment"; id: number; titlu: string; categorie: string; intarziat: boolean }
  | { fel: "treaba"; id: number; titlu: string; zona: string; minute: number; intarziat: boolean }
  | {
      fel: "google";
      id: string;
      titlu: string;
      persoanaId: number;
      persoana: string;
      ora: string | null;
      oraSfarsit: string | null;
    };

export type ZiDinCalendar = {
  ziua: string;
  /** Ziua din lună, 1–31. */
  numar: number;
  esteAzi: boolean;
  /** Zilele din lunile vecine, arătate palid ca să se închidă grila. */
  altaLuna: boolean;
  intrari: IntrareZi[];
};

/**
 * Culoarea fiecărui om din casă, după poziția lui în listă. Nu e o culoare de
 * stare: e o culoare de identitate, ca să știi a cui e dunga din calendar.
 */
export function culoareaPersoanei(pozitie: number) {
  return ["var(--color-cobalt)", "var(--color-pruna)"][pozitie % 2];
}

/* -------------------------------------------------------------- rețete */

export const MOMENTE = [
  { valoare: "mic-dejun", eticheta: "Mic dejun" },
  { valoare: "pranz", eticheta: "Prânz" },
  { valoare: "cina", eticheta: "Cină" },
] as const;

export function etichetaMomentului(valoare: string) {
  return MOMENTE.find((m) => m.valoare === valoare)?.eticheta ?? valoare;
}

/**
 * Starea unui ingredient față de cămară.
 *
 * Nu socotim cantități: rețeta cere „200 g piept de pui”, cămara zice „1 buc”, iar
 * dintr-o înmulțire pripită ar ieși un „nu-ți ajunge” greșit. Spunem doar dacă
 * lucrul e sau nu în casă — atât putem ști sigur.
 *
 * „nestiut” e ingredientul nelegat încă de un produs din catalog (așa vin cele
 * importate). Nu-l trecem nici la „ai”, nici la „lipsă”: n-avem de unde ști. Se
 * leagă cu un tap, iar rețeta devine mai deșteaptă de fiecare dată.
 */
export type StareIngredient = "ai" | "mereu" | "lipsa" | "nestiut";

export type IngredientAfisat = {
  id: number;
  textOriginal: string;
  produsId: number | null;
  nume: string;
  cantitate: number | null;
  unitate: string | null;
  optional: boolean;
  stare: StareIngredient;
  /** Câte zile mai are în cămară, dacă e pe acolo și are dată. */
  zilePanaLaExpirare: number | null;
};

export type RetetaAfisata = {
  id: number;
  titlu: string;
  pozaUrl: string | null;
  portii: number;
  minuteTotal: number | null;
  laTm6: boolean;
  efort: string;
  etichete: string[];
  favorit: boolean;
  sursa: string;
  url: string | null;
  instructiuni: string | null;
  ingrediente: IngredientAfisat[];
  /** Câte dintre ingredientele care contează sunt în casă, din câte. */
  ai: number;
  dinTotal: number;
  /** Ce se folosește în ea și stă să expire — motivul cel mai bun de a o găti. */
  expiraInEa: { nume: string; zile: number }[];
  ultimaGatireLa: string | null;
};

export type PropunereMeniu = {
  reteta: RetetaAfisata;
  /** De ce tocmai asta. Explicația e jumătate din propunere. */
  motiv: string;
};

export type MasaDinPlan = {
  id: number;
  data: string;
  moment: string;
  retetaId: number | null;
  titlu: string;
  gatitLa: number | null;
};

export type DateReteta = {
  id?: number;
  titlu: string;
  portii: number;
  minuteTotal: number | null;
  laTm6: boolean;
  efort: string;
  url: string | null;
  instructiuni: string | null;
  etichete: string[];
};
