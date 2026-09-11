import assert from "node:assert/strict";

import {
  fazaInZiua,
  fazaZilei,
  lungimeaCiclului,
  lungimeaMenstruatiei,
  segmenteleCiclului,
  stareaCiclului,
  ziuaOvulatiei,
  type CicluInregistrat,
} from "../lib/servicii/socoteli-ciclu.ts";

/*
  Probe pentru socoteala ciclului.

  Rulează cu `npm run proba`.
*/

/* ------------------------------------------------------ fără date proprii */

const gol = stareaCiclului([], "2026-09-11");
assert.equal(gol.faza, null, "fără nicio înregistrare nu spunem nicio fază");
assert.equal(gol.lungime, 28);
assert.equal(gol.dinCicluri, 0);

const unul: CicluInregistrat[] = [{ inceput: "2026-09-01", sfarsit: null }];
const cuUnul = stareaCiclului(unul, "2026-09-03");
assert.equal(cuUnul.ziuaCiclului, 3, "prima zi de menstruație e ziua 1");
assert.equal(cuUnul.faza, "menstruala");
assert.equal(cuUnul.lungime, 28, "până la un ciclu întreg, socotim cu 28");
assert.equal(cuUnul.urmatoareaLa, "2026-09-29");
assert.equal(cuUnul.zilePanaLaUrmatoarea, 26);

/* ---------------------------------------------------------- fazele pe zile */

// Ciclu de 28, menstruație de 5: ovulația în ziua 14.
assert.equal(ziuaOvulatiei(28, 5), 14);
assert.equal(fazaZilei(1, 28, 5), "menstruala");
assert.equal(fazaZilei(5, 28, 5), "menstruala");
assert.equal(fazaZilei(6, 28, 5), "foliculara");
assert.equal(fazaZilei(12, 28, 5), "foliculara");
assert.equal(fazaZilei(13, 28, 5), "ovulatorie");
assert.equal(fazaZilei(15, 28, 5), "ovulatorie");
assert.equal(fazaZilei(16, 28, 5), "luteala");
assert.equal(fazaZilei(28, 28, 5), "luteala");

// Ciclu lung, de 35: ovulația se mută spre 21, nu rămâne la 14.
assert.equal(ziuaOvulatiei(35, 5), 21, "ovulația se socotește de la capăt");
assert.equal(fazaZilei(16, 35, 5), "foliculara");

// Ciclu scurt cu menstruație lungă: ovulația nu cade niciodată în menstruație.
assert.ok(ziuaOvulatiei(21, 7) > 7);

/* ------------------------------------------------- media ciclurilor ei */

const ale_ei: CicluInregistrat[] = [
  { inceput: "2026-05-02", sfarsit: "2026-05-06" },
  { inceput: "2026-05-31", sfarsit: "2026-06-05" },
  { inceput: "2026-06-30", sfarsit: "2026-07-04" },
  { inceput: "2026-07-30", sfarsit: "2026-08-03" },
  { inceput: "2026-08-29", sfarsit: null },
];
assert.deepEqual(lungimeaCiclului(ale_ei), { zile: 30, dinCicluri: 4 }, "29, 30, 30, 30 → 30");
assert.equal(lungimeaMenstruatiei(ale_ei), 5, "5, 6, 5, 5 → 5");

// O menstruație nemarcată face un interval de 60 de zile; nu intră în medie.
const cuGaura: CicluInregistrat[] = [
  { inceput: "2026-03-01", sfarsit: null },
  { inceput: "2026-04-30", sfarsit: null },
  { inceput: "2026-05-28", sfarsit: null },
];
assert.deepEqual(lungimeaCiclului(cuGaura), { zile: 28, dinCicluri: 1 });

// Marcat de două ori, la trei zile distanță: nici asta nu strică media.
assert.deepEqual(
  lungimeaCiclului([
    { inceput: "2026-06-01", sfarsit: null },
    { inceput: "2026-06-04", sfarsit: null },
  ]),
  { zile: 28, dinCicluri: 0 },
);

/* --------------------------------------------------------------- starea de azi */

const azi = stareaCiclului(ale_ei, "2026-09-10");
assert.equal(azi.ziuaCiclului, 13);
assert.equal(azi.lungime, 30);
assert.equal(azi.faza, "foliculara", "ovulația estimată în ziua 16");
assert.equal(azi.urmatoareaLa, "2026-09-28");

// Menstruația marcată terminată mai devreme decât de obicei: ziua de după nu mai e menstruală.
const terminataDevreme = stareaCiclului(
  [...ale_ei.slice(0, -1), { inceput: "2026-08-29", sfarsit: "2026-08-31" }],
  "2026-09-01",
);
assert.equal(terminataDevreme.faza, "foliculara");
assert.equal(terminataDevreme.terminataCurent, true);

// Nemarcată de mult peste obicei: nu ghicim.
const demult = stareaCiclului(ale_ei, "2026-10-15");
assert.equal(demult.ziuaCiclului, 48);
assert.equal(demult.faza, null, "peste lungimea obișnuită plus 10 zile spunem „nu știm”");

// Câteva zile peste obicei: încă luteală, fără dramă.
assert.equal(stareaCiclului(ale_ei, "2026-09-30").faza, "luteala");

// Înregistrări din viitor (o dată greșită) nu contează pentru azi.
assert.equal(
  stareaCiclului([...ale_ei, { inceput: "2026-12-01", sfarsit: null }], "2026-09-10").ziuaCiclului,
  13,
);

/* ------------------------------------------------------------- faze din trecut */

// În trecut se folosește lungimea adevărată a ciclului de atunci, nu media.
assert.equal(fazaInZiua(ale_ei, "2026-06-02"), "menstruala", "5 iunie a fost ultima zi");
assert.equal(fazaInZiua(ale_ei, "2026-06-06"), "foliculara");
assert.equal(fazaInZiua(ale_ei, "2026-06-15"), "ovulatorie", "ciclul din iunie a avut 30 de zile");
assert.equal(fazaInZiua(ale_ei, "2026-06-29"), "luteala");
assert.equal(fazaInZiua(ale_ei, "2026-04-01"), null, "înainte de prima înregistrare nu știm");

/* ----------------------------------------------------------------- bara */

assert.deepEqual(segmenteleCiclului(28, 5), [
  { faza: "menstruala", deLa: 1, panaLa: 5 },
  { faza: "foliculara", deLa: 6, panaLa: 12 },
  { faza: "ovulatorie", deLa: 13, panaLa: 15 },
  { faza: "luteala", deLa: 16, panaLa: 28 },
]);

console.log("Probele ciclului au trecut.");
