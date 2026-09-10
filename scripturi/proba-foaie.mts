import assert from "node:assert/strict";

import {
  citesteAsezarea,
  litere,
  verificaIntervalul,
} from "../lib/servicii/asezare-foaie.ts";

/*
  Probă pentru citirea așezării din foaia de buget.

  Scrierea în foaie nu se poate încerca fără să murdărim bugetul real, așa că
  partea care contează — găsirea coloanelor și a rândului liber — e o funcție
  pură, verificată aici pe o replică a foii adevărate.

  Rulează cu `npm run proba`.
*/

const g = "";

// Replica foii 2026-09: A–F tabelul de cheltuieli, G gol, H–K tranzacțiile.
const foaie: unknown[][] = [
  ["BUGET LUNAR — 2026-09"],
  [],
  ["VENITURI", g, g, g, g, g, g, "TRANZACȚII LUNARE"],
  ["Sursă", "Planificat", "Real", g, g, g, g, "Data", "Categorie", "Sumă", "Descriere"],
  ["Salariu - Filip", 5000, g, g, g, g, g, "2026-09-01", "Sănătate", 16.26, "ata dentara"],
  ["Salariu - Ralu", 3500, 3531, g, g, g, g, "2026-09-01", "Mâncare", 99.07, "lidl"],
  ["Total Venituri", 10300, 4671, g, g, g, g, "2026-09-08", "Mâncare", 52.78, "lidl"],
  [],
  ["BUGET CHELTUIELI"],
  ["Categorie", "Tip", "Planificat", "Real (Local)", "Diferență", "Note"],
  ["Mâncare", "Necesară", 1500, 616, 884, "Groceries"],
  ["Total Cheltuieli", g, 9797.23, 3794.67],
];

const asezare = citesteAsezarea(foaie);
assert.ok(asezare, "n-am găsit tabelul de tranzacții");
assert.equal(asezare.randAntet, 4);
assert.equal(litere(asezare.coloanaData), "H");
assert.equal(litere(asezare.coloanaCategorie), "I");
assert.equal(litere(asezare.coloanaSuma), "J");
assert.equal(litere(asezare.coloanaDescriere), "K");
// Ultima tranzacție e pe rândul 7, deci scriem pe 8.
assert.equal(asezare.randUrmator, 8);

// În foile reale sunt rânduri goale în mijlocul tranzacțiilor (vezi august).
// Nu trebuie să le luăm drept sfârșitul tabelului.
const cuGol = [...foaie];
cuGol.splice(6, 0, []);
assert.equal(citesteAsezarea(cuGol)?.randUrmator, 9);

// Dacă cineva mută tabelul, îl găsim tot după antet, nu după litera coloanei.
const mutat = foaie.map((r) => (r.length > 1 ? [g, g, ...r] : r));
assert.equal(litere(citesteAsezarea(mutat)!.coloanaData), "J");

assert.equal(citesteAsezarea([["ceva"], ["altceva"]]), null);

assert.equal(litere(1), "A");
assert.equal(litere(8), "H");
assert.equal(litere(26), "Z");
assert.equal(litere(27), "AA");

// Tranzacțiile stau în I și J; D e coloana cheltuielilor, n-are treabă cu ele.
const COLOANE = ["H", "I", "J", "K"];

// Interval cu capăt fix: peste el, sumele nu mai intră în total.
const fix = [["=SUMIF($I$5:$I$200,$A11,$J$5:$J$200)"], ["=SUM(D11:D33)"]];
assert.equal(verificaIntervalul(fix, 150, COLOANE), null);
assert.match(verificaIntervalul(fix, 250, COLOANE) ?? "", /rândul 200/);

// Cum sunt de fapt formulele din foaia lor: interval deschis, adună toată
// coloana. Aici nu există „prea jos”, deci niciun avertisment.
const deschis = [["=SUMIF($I$5:$I,$A15,$J$5:$J)"], ["=SUM(D15:D37)"]];
assert.equal(
  verificaIntervalul(deschis, 400, COLOANE),
  null,
  "intervalele deschise nu trebuie să dea avertisment",
);

// Rândul de total însumează coloana D până la 37. Nu are legătură cu unde se
// termină tranzacțiile și nu trebuie luat drept limită.
assert.equal(
  verificaIntervalul([["=SUM(D15:D37)"]], 40, COLOANE),
  null,
  "formula de total nu limitează tranzacțiile",
);

assert.equal(verificaIntervalul([["120"]], 250, COLOANE), null, "fără formule, fără avertisment");

console.log("Toate probele au trecut.");
