import { cantitate as scrieCantitatea, cuDe } from "@/lib/formatare";

/*
  Cum alegem ce se gătește.

  Regula de la care pleacă tot: mâncarea care stă să expire bate orice altceva.
  Ea se pierde definitiv dacă n-o folosești azi; o rețetă amânată nu se pierde
  niciodată. Pe locul doi vine ce se poate găti fără drum la magazin, pe trei
  faptul că n-ai mâncat același lucru alaltăieri.

  Socoteala e o funcție pură, cu note explicite, din două motive: se poate proba
  fără bază de date, și — mai important — se poate spune omului **de ce** i-am
  propus asta. O propunere fără explicație e o ghicitoare.
*/

export type DateDeScor = {
  /** Câte ingrediente care contează lipsesc din casă. */
  lipsuri: number;
  /** Din câte. Nu intră la socoteală nici cele opționale, nici sarea și uleiul. */
  necesare: number;
  /** Câte lucruri folosite în rețetă stau să expire. */
  expiraInEa: number;
  /** De câte zile n-a mai fost gătită. Null dacă n-a fost gătită niciodată. */
  zileDeLaUltimaGatire: number | null;
  favorit: boolean;
  minuteTotal: number | null;
  /** Are ceva în calendar diseară. Atunci nu-i propunem trei ore de gătit. */
  searaOcupata: boolean;
};

/** Sub atâtea zile socotim că un produs „stă să expire”. */
export const EXPIRA_CURAND = 3;

/** O seară liniștită înseamnă că încape și o rețetă mai lungă de atât. */
const GATIT_SCURT = 30;

export function scorulRetetei(d: DateDeScor) {
  let scor = 0;

  // Ce expiră: semnalul cel mai puternic, dar plafonat — trei lucruri care
  // expiră nu fac rețeta de trei ori mai bună, o fac doar clar prima.
  scor += Math.min(d.expiraInEa, 3) * 20;

  // Ce se poate găti acum, fără drum la magazin.
  scor += d.necesare === 0 ? 20 : (1 - d.lipsuri / d.necesare) * 35;

  // Varietate: gătită azi înseamnă „nu iar”; după zece zile nu mai contează.
  if (d.zileDeLaUltimaGatire != null) {
    scor -= Math.max(0, 25 - d.zileDeLaUltimaGatire * 2.5);
  }

  if (d.favorit) scor += 6;

  if (d.searaOcupata) {
    // Într-o seară plină, fiecare minut peste o jumătate de oră doare.
    if (d.minuteTotal && d.minuteTotal > GATIT_SCURT) {
      scor -= (d.minuteTotal - GATIT_SCURT) * 0.6;
    }
    // Și nici la magazin nu te mai trimitem.
    if (d.lipsuri > 0) scor -= 8;
  }

  return scor;
}

/**
 * De ce tocmai asta. Se ia primul motiv adevărat, în ordinea în care i-ar păsa
 * unui om — nu se înșiră toate.
 */
export function motivulPropunerii(
  d: DateDeScor,
  detalii: { primulCareExpira?: { nume: string; zile: number }; primaLipsa?: string },
) {
  const expira = detalii.primulCareExpira;
  if (expira) {
    const cand =
      expira.zile < 0
        ? "a expirat"
        : expira.zile === 0
          ? "expiră azi"
          : expira.zile === 1
            ? "expiră mâine"
            : `mai are ${expira.zile} zile`;
    return `Folosește ${expira.nume.toLowerCase()}, ${cand}`;
  }

  if (d.lipsuri === 0) {
    if (d.searaOcupata && d.minuteTotal && d.minuteTotal <= GATIT_SCURT) {
      return `Ai tot ce trebuie și e gata în ${cuDe(d.minuteTotal, "minute")}`;
    }
    return "Ai tot ce trebuie în casă";
  }

  if (d.lipsuri === 1 && detalii.primaLipsa) {
    return `Îți lipsește doar ${detalii.primaLipsa.toLowerCase()}`;
  }

  return `Îți lipsesc ${d.lipsuri} lucruri`;
}

/*
  Ingredientele se scriu cum se vorbește: „2 cepe”, „500 g piept de pui”,
  „o lingură de miere”. Despărțim cantitatea de nume ca să putem lega numele de
  catalog, dar păstrăm textul întreg — el e cel care se citește la gătit.
*/

// Scrisă ca expresie, nu construită din bucăți: e mai ușor de citit și n-are
// cum să se strice la o mutare de fișier.
const CANTITATE =
  /^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|buc|linguri|lingură|linguriță|căni|cană)?\s+(?:de\s+)?(.+)$/i;

export function desparteCantitatea(text: string) {
  const curat = text.trim();
  const potrivire = curat.match(CANTITATE);

  if (!potrivire) return { cantitate: null, unitate: null, nume: curat };

  return {
    cantitate: Number(potrivire[1].replace(",", ".")),
    unitate: potrivire[2]?.toLowerCase() ?? null,
    nume: potrivire[3].trim(),
  };
}

/**
 * Cum se scrie în rețetă un ingredient ales din catalog: „500 g piept de pui”.
 * Fără cantitate rămâne numele din catalog, cu majuscula lui.
 */
export function textIngredient(nume: string, cantitate: number | null, unitate: string | null) {
  if (!cantitate) return nume;
  const mic = nume.charAt(0).toLocaleLowerCase("ro") + nume.slice(1);
  return `${scrieCantitatea(cantitate, unitate ?? "buc")} ${mic}`;
}

// Unitățile stau acum în lib/unitati.ts, împărțite cu cămara.
export { UNITATI_RETETA, unitateaDeReteta } from "@/lib/unitati";
