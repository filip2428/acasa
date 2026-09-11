import { deplaseaza, zileIntre } from "@/lib/formatare";

/*
  Socoteala ciclului.

  Pleacă de la un singur lucru pe care îl știm sigur: ziua în care a început
  fiecare menstruație (și, dacă a fost marcată, ziua în care s-a terminat). Tot
  restul e estimare, iar codul de mai jos încearcă să nu se prefacă altfel:

  - lungimea ciclului e media ciclurilor ei, nu 28 „pentru că așa scrie”; până se
    adună măcar un ciclu întreg, folosim totuși 28;
  - ovulația se socotește de la capăt — cu vreo 14 zile înainte de următoarea
    menstruație — pentru că faza de după ovulație variază mult mai puțin de la o
    femeie la alta decât cea de dinainte;
  - când a trecut mult peste lungimea obișnuită și nu s-a marcat nimic, spunem
    „nu știm”, nu ghicim o fază.

  Funcții pure, fără bază de date, probate în `scripturi/proba-ciclu.mts`.
*/

export type Faza = "menstruala" | "foliculara" | "ovulatorie" | "luteala";

export const FAZE: Record<Faza, { eticheta: string; culoare: string }> = {
  menstruala: { eticheta: "Menstruală", culoare: "var(--color-faza-menstruala)" },
  foliculara: { eticheta: "Foliculară", culoare: "var(--color-faza-foliculara)" },
  ovulatorie: { eticheta: "Ovulatorie", culoare: "var(--color-faza-ovulatorie)" },
  luteala: { eticheta: "Luteală", culoare: "var(--color-faza-luteala)" },
};

export const ORDINEA_FAZELOR: Faza[] = ["menstruala", "foliculara", "ovulatorie", "luteala"];

export type CicluInregistrat = { inceput: string; sfarsit: string | null };

/** Cu cât se socotește până există date proprii. */
export const LUNGIME_OBISNUITA = 28;
export const MENSTRUATIE_OBISNUITA = 5;
/** Faza de după ovulație ține cam atât și variază puțin. */
const DUPA_OVULATIE = 14;
/** Câte cicluri recente intră în medie: destule cât să nu sară, puține cât să urmeze schimbările. */
const CICLURI_IN_MEDIE = 6;
/** Peste atâtea zile peste lungimea obișnuită nu mai ghicim faza. */
const TOLERANTA = 10;

function inOrdine(cicluri: CicluInregistrat[]) {
  return [...cicluri].sort((a, b) => a.inceput.localeCompare(b.inceput));
}

/**
 * Lungimile ciclurilor încheiate, de la cel mai vechi. Un interval sub 21 sau
 * peste 45 de zile e aproape sigur o menstruație nemarcată sau marcată de două ori,
 * așa că nu-l lăsăm să strice media.
 */
export function lungimiIncheiate(cicluri: CicluInregistrat[]) {
  const ordonate = inOrdine(cicluri);
  const lungimi: number[] = [];
  for (let i = 1; i < ordonate.length; i += 1) {
    const zile = zileIntre(ordonate[i - 1].inceput, ordonate[i].inceput);
    if (zile >= 21 && zile <= 45) lungimi.push(zile);
  }
  return lungimi;
}

function media(valori: number[]) {
  return Math.round(valori.reduce((t, v) => t + v, 0) / valori.length);
}

/** Lungimea obișnuită a ciclului și din câte cicluri e socotită. */
export function lungimeaCiclului(cicluri: CicluInregistrat[]) {
  const lungimi = lungimiIncheiate(cicluri).slice(-CICLURI_IN_MEDIE);
  if (lungimi.length === 0) return { zile: LUNGIME_OBISNUITA, dinCicluri: 0 };
  return { zile: media(lungimi), dinCicluri: lungimi.length };
}

/** Câte zile ține de obicei menstruația, din ce s-a marcat ca terminat. */
export function lungimeaMenstruatiei(cicluri: CicluInregistrat[]) {
  const durate = inOrdine(cicluri)
    .filter((c) => c.sfarsit && c.sfarsit >= c.inceput)
    .map((c) => zileIntre(c.inceput, c.sfarsit!) + 1)
    .filter((d) => d >= 2 && d <= 10)
    .slice(-CICLURI_IN_MEDIE);

  return durate.length === 0 ? MENSTRUATIE_OBISNUITA : media(durate);
}

/** Ziua din ciclu la care cade ovulația estimată. Niciodată în timpul menstruației. */
export function ziuaOvulatiei(lungime: number, menstruatie: number) {
  return Math.max(lungime - DUPA_OVULATIE, menstruatie + 2);
}

/** Faza unei zile din ciclu (1 = prima zi de menstruație). */
export function fazaZilei(ziuaCiclului: number, lungime: number, menstruatie: number): Faza {
  const ovulatie = ziuaOvulatiei(lungime, menstruatie);
  if (ziuaCiclului <= menstruatie) return "menstruala";
  if (ziuaCiclului < ovulatie - 1) return "foliculara";
  if (ziuaCiclului <= ovulatie + 1) return "ovulatorie";
  return "luteala";
}

export type StareaCiclului = {
  /** Null când nu putem spune: fără înregistrări, sau a trecut prea mult de la ultima. */
  faza: Faza | null;
  ziuaCiclului: number | null;
  lungime: number;
  /** Din câte cicluri încheiate e socotită lungimea. 0 = folosim 28. */
  dinCicluri: number;
  menstruatie: number;
  inceputCurent: string | null;
  /** Dacă menstruația din ciclul ăsta a fost marcată ca terminată. */
  terminataCurent: boolean;
  urmatoareaLa: string | null;
  zilePanaLaUrmatoarea: number | null;
};

export function stareaCiclului(cicluri: CicluInregistrat[], ziua: string): StareaCiclului {
  const panaAzi = inOrdine(cicluri).filter((c) => c.inceput <= ziua);
  const { zile: lungime, dinCicluri } = lungimeaCiclului(panaAzi);
  const curent = panaAzi.at(-1);

  if (!curent) {
    return {
      faza: null,
      ziuaCiclului: null,
      lungime,
      dinCicluri,
      menstruatie: MENSTRUATIE_OBISNUITA,
      inceputCurent: null,
      terminataCurent: false,
      urmatoareaLa: null,
      zilePanaLaUrmatoarea: null,
    };
  }

  const ziuaCiclului = zileIntre(curent.inceput, ziua) + 1;
  const terminata = Boolean(curent.sfarsit && curent.sfarsit >= curent.inceput);

  // Menstruația de acum: cât a ținut de fapt, dacă s-a marcat; altfel cât ține de
  // obicei. Dacă s-a marcat terminată azi sau ieri, ziua de după nu mai e menstruală.
  const menstruatie = terminata
    ? zileIntre(curent.inceput, curent.sfarsit!) + 1
    : lungimeaMenstruatiei(panaAzi.slice(0, -1));

  const urmatoareaLa = deplaseaza(curent.inceput, lungime);
  const preaDemult = ziuaCiclului > lungime + TOLERANTA;

  return {
    faza: preaDemult ? null : fazaZilei(ziuaCiclului, lungime, menstruatie),
    ziuaCiclului,
    lungime,
    dinCicluri,
    menstruatie,
    inceputCurent: curent.inceput,
    terminataCurent: terminata,
    urmatoareaLa,
    zilePanaLaUrmatoarea: zileIntre(ziua, urmatoareaLa),
  };
}

/**
 * Faza unei zile din trecut, cu ce știm acum despre ciclul de atunci: dacă a
 * urmat altă menstruație, lungimea e cea adevărată, nu media. Folosită la
 * tiparele din starea zilnică.
 */
export function fazaInZiua(cicluri: CicluInregistrat[], ziua: string): Faza | null {
  const ordonate = inOrdine(cicluri);
  const index = ordonate.findLastIndex((c) => c.inceput <= ziua);
  if (index < 0) return null;

  const ciclu = ordonate[index];
  const urmator = ordonate[index + 1];
  const lungime = urmator
    ? zileIntre(ciclu.inceput, urmator.inceput)
    : lungimeaCiclului(ordonate.slice(0, index + 1)).zile;

  const ziuaCiclului = zileIntre(ciclu.inceput, ziua) + 1;
  if (ziuaCiclului > lungime + (urmator ? 0 : TOLERANTA)) return null;

  const menstruatie =
    ciclu.sfarsit && ciclu.sfarsit >= ciclu.inceput
      ? zileIntre(ciclu.inceput, ciclu.sfarsit) + 1
      : lungimeaMenstruatiei(ordonate.slice(0, index));

  return fazaZilei(ziuaCiclului, lungime, menstruatie);
}

/** Bucățile ciclului, pentru bara de pe ecran: fiecare fază cu zilele ei. */
export function segmenteleCiclului(lungime: number, menstruatie: number) {
  const segmente: { faza: Faza; deLa: number; panaLa: number }[] = [];
  for (let zi = 1; zi <= lungime; zi += 1) {
    const faza = fazaZilei(zi, lungime, menstruatie);
    const ultimul = segmente.at(-1);
    if (ultimul && ultimul.faza === faza) ultimul.panaLa = zi;
    else segmente.push({ faza, deLa: zi, panaLa: zi });
  }
  return segmente;
}

/* -------------------------------------------------------- ce prinde bine */

/*
  Doar ce are sprijin real în studii, spus cu măsură. „Dietele pe faze” de pe
  internet merg mult mai departe decât dovezile; aici, în fazele în care nu e
  nimic anume de schimbat, spunem exact asta.
*/

export const ETICHETE_NUTRITIE = [
  { valoare: "fier", eticheta: "Bogat în fier", scurt: "bogată în fier" },
  { valoare: "magneziu", eticheta: "Magneziu", scurt: "cu magneziu" },
  {
    valoare: "carbohidrați complecși",
    eticheta: "Carbohidrați complecși",
    scurt: "cu carbohidrați complecși",
  },
] as const;

export const CE_PRINDE_BINE: Record<Faza, { titlu: string; text: string; etichete: string[] }> = {
  menstruala: {
    titlu: "Fier și ceva cald",
    text: "În zilele astea se pierde fier. Carnea roșie, lintea, fasolea sau spanacul ajută, mai ales lângă ceva cu vitamina C — ardei, citrice — care îl face să se absoarbă mai bine.",
    etichete: ["fier"],
  },
  foliculara: {
    titlu: "Nimic de schimbat",
    text: "Energia urcă de obicei în zilele astea. Nu e nimic anume de adăugat în farfurie — mâncarea obișnuită e numai bună.",
    etichete: [],
  },
  ovulatorie: {
    titlu: "Nimic de schimbat",
    text: "Pentru zilele din jurul ovulației nu există o recomandare de mâncare cu dovezi în spate. Mâncarea obișnuită e numai bună.",
    etichete: [],
  },
  luteala: {
    titlu: "Magneziu și carbohidrați buni",
    text: "În săptămâna dinainte corpul consumă puțin mai mult și poftele cresc. Leguminoasele, semințele, ovăzul, cartofii sau ciocolata neagră țin de foame mai mult, iar magneziul din ele poate îmblânzi simptomele de dinainte.",
    etichete: ["magneziu", "carbohidrați complecși"],
  },
};

/** Simptomele care se pot bifa în starea zilei. Puține, ca să se bifeze într-o secundă. */
export const SIMPTOME = [
  "crampe",
  "dureri de cap",
  "balonare",
  "oboseală",
  "somn prost",
  "poftă de dulce",
  "iritabilitate",
] as const;
