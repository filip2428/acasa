import assert from "node:assert/strict";

import {
  cifraInCamp,
  citesteCifra,
  convertesteCantitatea,
  pasulCantitatii,
  unitateaDeReteta,
} from "../lib/unitati.ts";

/*
  Probe pentru unitățile de măsură din cămară și din rețete.

  Rulează cu `npm run proba`.
*/

/* -------------------------------------------------------------- conversii */

assert.equal(convertesteCantitatea(1.5, "kg", "g"), 1500);
assert.equal(convertesteCantitatea(250, "g", "kg"), 0.25);
assert.equal(convertesteCantitatea(750, "ml", "l"), 0.75);
assert.equal(convertesteCantitatea(2, "l", "ml"), 2000);
assert.equal(convertesteCantitatea(3, "buc", "buc"), 3, "aceeași unitate rămâne neatinsă");

assert.equal(convertesteCantitatea(1, "kg", "ml"), null, "masa nu se face volum");
assert.equal(convertesteCantitatea(2, "buc", "g"), null, "o bucată n-are greutate știută");
assert.equal(convertesteCantitatea(1, "borcan", "kg"), null);

assert.equal(convertesteCantitatea(333, "g", "kg"), 0.333, "fără coadă de zecimale");

/* ------------------------------------------------------------------- pași */

assert.equal(pasulCantitatii("g"), 50);
assert.equal(pasulCantitatii("ml"), 50);
assert.equal(pasulCantitatii("kg"), 0.25);
assert.equal(pasulCantitatii("buc"), 1);
assert.equal(pasulCantitatii("borcan"), 1);

/* ------------------------------------------------------------------ câmpuri */

assert.equal(citesteCifra("1,5"), 1.5, "virgula de pe tastatura românească");
assert.equal(citesteCifra("1.5"), 1.5);
assert.equal(citesteCifra(" 250 "), 250);
assert.equal(citesteCifra(""), null);
assert.equal(citesteCifra("0"), null, "zero nu e o cantitate");
assert.equal(citesteCifra("mult"), null);

assert.equal(cifraInCamp(0.25), "0,25");
assert.equal(cifraInCamp(0.1 + 0.2), "0,3");

/* ------------------------------------------------------------------ rețete */

assert.equal(unitateaDeReteta("kg"), "g");
assert.equal(unitateaDeReteta("l"), "ml");
assert.equal(unitateaDeReteta("buc"), "buc");

console.log("Probele unităților au trecut.");
