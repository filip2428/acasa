/*
  Unitățile de măsură, într-un singur loc.

  Cămara și rețetele vorbesc aceeași limbă — grame, kilograme, bucăți — dar nu
  în aceleași cuvinte: în cămară ai „un borcan”, în rețetă ai „o lingură”. De
  aici două liste, cu partea de bază comună.

  Fișierul n-are nimic de server, ca să-l poată folosi și ecranele.
*/

export const UNITATI_CAMARA = ["buc", "g", "kg", "ml", "l", "pachet", "borcan"] as const;

/** Unitățile în care se scriu rețetele, nu cele în care se cumpără. */
export const UNITATI_RETETA = ["g", "kg", "ml", "l", "buc", "linguri", "linguriță", "cană"] as const;

/** Produsul se cumpără la kilogram, dar în rețetă se cântărește în grame. */
export function unitateaDeReteta(unitateaProdusului: string) {
  if (unitateaProdusului === "kg") return "g";
  if (unitateaProdusului === "l") return "ml";
  return unitateaProdusului;
}

/** Fără coada de zecimale pe care o lasă înmulțirile: 0,1 + 0,2 rămâne 0,3. */
export function rotunjeste(valoare: number) {
  return Math.round(valoare * 1000) / 1000;
}

const CONVERSII: Record<string, { baza: string; factor: number }> = {
  g: { baza: "g", factor: 1 },
  kg: { baza: "g", factor: 1000 },
  ml: { baza: "ml", factor: 1 },
  l: { baza: "ml", factor: 1000 },
};

/**
 * Aceeași cantitate, în altă unitate: 1,5 kg → 1500 g.
 *
 * Null când nu se poate — din bucăți în grame n-avem cum, pentru că un „borcan”
 * nu cântărește la fel la toate produsele. Atunci ecranul lasă cifra neatinsă.
 */
export function convertesteCantitatea(valoare: number, din: string, inUnitate: string) {
  if (din === inUnitate) return valoare;

  const a = CONVERSII[din];
  const b = CONVERSII[inUnitate];
  if (!a || !b || a.baza !== b.baza) return null;

  return rotunjeste((valoare * a.factor) / b.factor);
}

/**
 * Cât adaugă un „+” în cămară. Un gram în plus n-ajută pe nimeni; 50 de grame
 * sau un sfert de kilogram e cât se ia de obicei dintr-o dată.
 */
export function pasulCantitatii(unitate: string) {
  if (unitate === "g" || unitate === "ml") return 50;
  if (unitate === "kg" || unitate === "l") return 0.25;
  return 1;
}

/** „1,5” — cum se scrie cifra într-un câmp, cu virgula noastră. */
export function cifraInCamp(valoare: number) {
  return String(rotunjeste(valoare)).replace(".", ",");
}

/** Citește ce s-a scris într-un câmp: „1,5”, „1.5”, „ 250 ”. Null dacă nu e o cantitate. */
export function citesteCifra(text: string) {
  const curat = text.trim().replace(",", ".");
  if (!curat) return null;
  const numar = Number(curat);
  return Number.isFinite(numar) && numar > 0 ? rotunjeste(numar) : null;
}
