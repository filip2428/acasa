/*
  Citirea structurii unei foi lunare din Buget_Familial.

  Fișierul n-are „server-only” și nu atinge rețeaua: sunt funcții pure, ca să le
  putem verifica fără credențiale Google și fără să scriem în bugetul adevărat.
  Vezi `scripturi/proba-foaie.mts`.

  Structura reală a unei foi lunare:

      A          B     C           D             E          F     G   H     I          J     K
      Categorie  Tip   Planificat  Real (Local)  Diferență  Note      Data  Categorie  Sumă  Descriere

  Tranzacțiile stau în H–K și curg mult mai jos decât tabelul din stânga, iar
  „Real (Local)” se calculează singur din ele.

  Nu presupunem literele coloanelor: le căutăm după antet, la fiecare scriere.
  Foaia e a lor și o pot rearanja oricând, iar o scriere pe coloana greșită ar
  strica luna fără să se vadă.
*/

export type Asezare = {
  /** Rândul cu antetul „Data | Categorie | Sumă | Descriere”, numerotat de la 1. */
  randAntet: number;
  coloanaData: number;
  coloanaCategorie: number;
  coloanaSuma: number;
  coloanaDescriere: number;
  /** Primul rând liber de sub ultima tranzacție. */
  randUrmator: number;
};

export function citesteAsezarea(randuri: unknown[][]): Asezare | null {
  const text = (v: unknown) => String(v ?? "").trim().toLowerCase();

  for (let r = 0; r < randuri.length; r++) {
    const rand = randuri[r] ?? [];
    const cData = rand.findIndex((c) => text(c) === "data");
    if (cData < 0) continue;
    if (text(rand[cData + 1]) !== "categorie") continue;
    if (text(rand[cData + 2]) !== "sumă") continue;

    // Ultimul rând cu ceva în blocul de tranzacții. Căutăm până la capăt, nu
    // până la primul gol: foile reale au rânduri goale în mijlocul listei.
    let ultimul = r;
    for (let i = r + 1; i < randuri.length; i++) {
      const celule = (randuri[i] ?? []).slice(cData, cData + 4);
      if (celule.some((c) => String(c ?? "").trim() !== "")) ultimul = i;
    }

    return {
      randAntet: r + 1,
      coloanaData: cData + 1,
      coloanaCategorie: cData + 2,
      coloanaSuma: cData + 3,
      coloanaDescriere: cData + 4,
      randUrmator: ultimul + 2,
    };
  }

  return null;
}

/** Numărul unei coloane în litere: 1 → A, 8 → H, 27 → AA. */
export function litere(coloana: number) {
  let rezultat = "";
  let n = coloana;
  while (n > 0) {
    const rest = (n - 1) % 26;
    rezultat = String.fromCharCode(65 + rest) + rezultat;
    n = Math.floor((n - 1) / 26);
  }
  return rezultat;
}

/**
 * Verifică dacă rândul în care am scris intră în intervalul pe care îl adună
 * formulele din „Real (Local)”.
 *
 * Foaia a fost făcută de mână. Dacă cineva pune la un moment dat un interval cu
 * capăt fix — `$I$5:$I$200` în loc de `$I$5:$I` — tranzacțiile de dincolo de el
 * se scriu frumos în foaie dar nu se mai adună nicăieri, iar asta nu se vede
 * până la sfârșitul lunii.
 *
 * Ne uităm numai la intervalele care chiar ating coloanele tranzacțiilor:
 * formulele de total însumează coloana cheltuielilor (`=SUM(D15:D37)`) și n-au
 * nicio legătură cu unde se termină tranzacțiile.
 */
export function verificaIntervalul(
  formule: unknown[][],
  rand: number,
  coloaneTranzactii: string[],
): string | null {
  const urmarite = new Set(coloaneTranzactii.map((c) => c.toUpperCase()));
  const capete: number[] = [];

  for (const linie of formule) {
    for (const celula of linie) {
      const formula = String(celula ?? "");
      if (!formula.startsWith("=")) continue;

      // Prinde și „$I$5:$I$200”, și „$I$5:$I” (deschis la capăt).
      for (const potrivire of formula.matchAll(
        /\$?([A-Z]{1,2})\$?(\d+)\s*:\s*\$?([A-Z]{1,2})\$?(\d*)/g,
      )) {
        const [, coloanaStart, , coloanaFinal, randFinal] = potrivire;
        if (!urmarite.has(coloanaStart.toUpperCase()) && !urmarite.has(coloanaFinal.toUpperCase())) {
          continue;
        }
        // Interval deschis: adună toată coloana, deci nu avem ce să avertizăm.
        if (randFinal === "") return null;
        capete.push(Number(randFinal));
      }
    }
  }

  if (capete.length === 0) return null;

  const capat = Math.max(...capete);
  if (rand <= capat) return null;

  return (
    `Cheltuiala s-a scris pe rândul ${rand}, dar formulele din „Real (Local)” ` +
    `adună doar până la rândul ${capat}. Până extinzi intervalul în foaie, ` +
    "suma apare în tabel dar nu intră în total."
  );
}
