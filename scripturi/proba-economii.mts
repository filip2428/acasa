import assert from "node:assert/strict";

import {
  citesteEconomii,
  citesteLuna,
  citesteNotaDepozit,
  citesteTinte,
  conturiFaraFond,
  contPentruScop,
  conversie,
  costDeBaza,
  costDupaRetragere,
  dobandaNeta,
  fonduri,
  fonduriDinLuna,
  imparteVenit,
  luniIntre,
  numar,
  procenteRegula,
  scopDinFinantare,
  sumarLuna,
  surseDinEconomii,
  ziDinFoaie,
} from "../lib/servicii/model-buget.ts";

/*
  Probe pentru citirea foii Buget_Familial v2 și socotelile de economii.
  Rulează cu `npm run proba`. Nu atinge Google: replici ale foilor adevărate.
*/

const g = "";
// 05.11.2026 ca număr de serie Sheets
const Z = (zi: string) => (Date.UTC(+zi.slice(0, 4), +zi.slice(5, 7) - 1, +zi.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86_400_000;

assert.equal(ziDinFoaie(Z("2026-11-05")), "2026-11-05");
assert.equal(ziDinFoaie("05.11.2026"), "2026-11-05");
assert.equal(ziDinFoaie(""), null);
assert.equal(numar("1.240,50 lei"), 1240.5);
assert.equal(numar("1,240.50"), 1240.5);

/* ------------------------------------------------------------ foaia lunii */

const tx = (data: string, cat: string, suma: number, desc = "", fin = "") => [Z(data), cat, suma, desc, fin];
const foaie: unknown[][] = [
  ["BUGET LUNAR — 2026-11"],
  [],
  ["VENITURI", g, g, g, g, g, g, "TRANZACȚII LUNARE"],
  ["Sursă", "Planificat", "Real", "Note", g, g, g, "Data", "Categorie", "Sumă", "Descriere", "Finanțat din"],
  ["Salariu - Filip", 5000, 5000, g, g, g, g, ...tx("2026-11-02", "Mâncare", 150, "lidl")],
  ["Salariu - Ralu", 3500, 3500, g, g, g, g, ...tx("2026-11-03", "Electronice", 1000, "iPad", "Din Fond Tech")],
  ["Venit ocazional", 1000, 1000, g, g, g, g, ...tx("2026-11-05", "Fond de urgență", 270, "[Ocazional] cadou")],
  ["Total Venituri", 9500, 9500],
  [],
  ["BUGET CHELTUIELI"],
  ["Categorie", "Tip", "Planificat", "Real (Local)", "Diferență", "Note"],
  ["Mâncare", "Esențială", 1500, 150],
  ["Zeciuiala", "Dăruire", 950, 0],
  ["Electronice", "Flexibilă", 0, 0],
  ["Fond Tech", "Fond", 300, 0],
  ["Nunti", "Fond", 250, 0],
  ["Fond de urgență", "Avere", 850, 270],
  ["Total Cheltuieli", g, 3850, 420],
];
const luna = citesteLuna(foaie);
assert.deepEqual(luna.antetTx, { rand: 4, coloana: 8, areFinantare: true });
assert.equal(luna.tranzactii.length, 3);
assert.equal(luna.tranzactii[1].finantare, "Din Fond Tech");
assert.equal(luna.tranzactii[0].data, "2026-11-02");
assert.equal(luna.randUrmator, 8);
assert.equal(luna.categorii.length, 6);
assert.equal(luna.randTotalVenituri, 8);

const s = sumarLuna(luna);
assert.equal(s.venitTotal, 9500);
assert.equal(s.venitOcazional, 1000);
assert.equal(s.venitRecurent, 8500);
assert.equal(s.platitDinEconomii, 1000, "iPad-ul din Fond Tech e separat");
assert.equal(s.economisit, 270);
assert.equal(s.investit, 270);
assert.equal(s.grupe.find((x) => x.tip === "Esențială")!.real, 150);
assert.deepEqual(surseDinEconomii(luna), ["Din Fond Tech", "Din Nunti", "Din Fond de urgență", "Din economii generale", "Din ajutor familie"]);
assert.equal(scopDinFinantare("Din economii generale"), "Nealocat");
assert.equal(scopDinFinantare("Din Fond Tech"), "Fond Tech");
console.log("✓ luna: venituri, categorii pe grupe, tranzacții cu „Finanțat din”, sumar");

// O lună de dinainte de v2 (fără coloana L) se citește la fel.
const veche = foaie.map((r, i) => (i === 3 ? r.slice(0, 11) : r));
assert.equal(citesteLuna(veche).antetTx?.areFinantare, false);

/* ------------------------------------------------------------ foaia Economii */

const economiiGrila: unknown[][] = Array.from({ length: 42 }, () => []);
economiiGrila[8] = [0.1, g, g, g, 5094, g, 6];
const cont = (r: number, v: unknown[]) => { economiiGrila[r - 1] = v; };
//                A        B                  C                   D        E      F      G         H       I      J  K              L                  M  N                  O    P  Q                  R
cont(13, ["ING", "cont de economii", "Cont de economii", "Filip", "RON", 26800, 1, 26800, 0.08, g, "Imediat", g, g, "Fond de urgență"]);
cont(14, ["BT", "Fond Tech", "Cont de economii", "Comun", "RON", 1200, 1, 1200, 0.0275, g, "Imediat", g, g, "Fond Tech"]);
cont(15, ["XTB", g, "Broker / Acțiuni", "Filip", "EUR", 890, 5.34, 4752.6, 0.06, g, "Imediat", g, g, "Investitii", 840]);
cont(16, ["TBI", "Depozit 3 luni", "Depozit", "Filip", "RON", 6000, 1, 6000, 0.07, g, "La scadență", Z("2027-03-04"), g, "Fond de urgență", g, g, g, "constituit 04.12.2026 · 3 luni"]);
cont(17, ["BT", g, "Cont curent", "Filip", "RON", 200, 1, 200, 0, g, "Imediat", g, g, "Nealocat"]);
const ec = citesteEconomii(economiiGrila);
assert.equal(ec.conturi.length, 5);
assert.equal(ec.randuriLibere[0], 18);
assert.equal(ec.impozit, 0.1);
assert.equal(ec.conturi[3].scadenta, "2027-03-04");
assert.equal(contPentruScop(ec.conturi, "Fond de urgență")!.institutie, "ING", "lichid înaintea depozitului");
assert.equal(contPentruScop(ec.conturi, "Nunti"), null);
console.log("✓ Economii: conturi, rânduri libere, contul implicit al unui fond");

/* ------------------------------------------------------------ fonduri */

const tinte = citesteTinte([[], [], [], ["Fond", "Tip", "În conturi", "Conturi", "Țintă", "Până la"], ["Nunti", "Fond", g, g, 3000, Z("2027-05-30")], ["Fond Tech", "Fond", g, g, "", ""]]);
assert.deepEqual(tinte.get("Nunti"), { tinta: 3000, panaLa: "2027-05-30" });
const fd = fonduri(luna, ec, tinte, "2026-11-05", 30564);
const tech = fd.find((f) => f.nume === "Fond Tech")!;
assert.equal(tech.inConturi, 1200); assert.equal(tech.platit, 1000); assert.equal(tech.deMutat, 300);
const urg = fd.find((f) => f.nume === "Fond de urgență")!;
assert.equal(urg.inConturi, 32800, "ING + depozitul TBI");
assert.equal(urg.tinta, 30564, "ținta vine din costul de bază");
assert.equal(urg.deMutat, 580);
const nunti = fd.find((f) => f.nume === "Nunti")!;
assert.equal(nunti.conturi.length, 0);
assert.equal(nunti.necesarPeLuna, 500, "3000 în 6 luni");
assert.deepEqual(conturiFaraFond(ec, fonduriDinLuna(luna)).map((c) => c.institutie), ["XTB", "BT"]);
assert.equal(luniIntre("2026-11-05", "2027-05-30"), 6);
assert.equal(luniIntre("2026-11-05", "2026-11-20"), 1);
console.log("✓ fonduri: sold din conturi, de mutat, plătit din fond, necesar pe lună");

/* ------------------------------------------------------------ calcule */

assert.equal(conversie(1000, 1, 5.339891), 187.27);
assert.equal(dobandaNeta(10000, 0.07, 365, false, 0.1), 630);
assert.equal(dobandaNeta(10000, 0.07, 365, true, 0.1), 700);
assert.equal(costDupaRetragere(840, 890, 89), 756);
assert.deepEqual(citesteNotaDepozit("constituit 05.11.2026 · 6 luni"), { start: "2026-11-05", luni: 6 });
const baza = costDeBaza([luna]);
assert.deepEqual(baza, { baza: 150, cuTampon: 187.5 });
console.log("✓ curs, dobândă (cu și fără impozit), cost la retragere, cost de bază");

/* ------------------------------------------------------------ venit ocazional */

assert.deepEqual(imparteVenit(1000, true, procenteRegula("standard", "Comun")),
  { suma: 1000, zeciuiala: 100, rest: 900, investitii: 450, fond: 270, guiltFreeFilip: 90, guiltFreeRalu: 90 });
assert.deepEqual(imparteVenit(500, true, procenteRegula("guiltfree", "Ralu")),
  { suma: 500, zeciuiala: 50, rest: 450, investitii: 0, fond: 0, guiltFreeFilip: 0, guiltFreeRalu: 450 });
for (const suma of [333.33, 0.07, 1234.57, 19.99]) {
  for (const r of ["standard", "guiltfree", "fond", "investitii"] as const) {
    const p = imparteVenit(suma, true, procenteRegula(r, "Comun"));
    assert.equal(Math.round((p.zeciuiala + p.investitii + p.fond + p.guiltFreeFilip + p.guiltFreeRalu) * 100), Math.round(suma * 100));
  }
}
console.log("✓ venit ocazional: regulile împart exact orice sumă");

console.log("\nToate probele de economii au trecut.");
