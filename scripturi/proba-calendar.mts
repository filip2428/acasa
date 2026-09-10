import assert from "node:assert/strict";

import type { EvenimentGoogle } from "../lib/domeniu.ts";
import { cuDe } from "../lib/formatare.ts";
import {
  candIncape,
  marginileGrilei,
  sfertulUrmator,
} from "../lib/servicii/socoteli-calendar.ts";

/*
  Probe pentru socotelile calendarului.

  Două lucruri care se strică fără să se vadă: grila lunii (cade greșit în
  lunile care încep duminica) și găsirea unei ferestre libere după-masa. Ambele
  sunt funcții pure, deci se pot proba fără Google și fără baza de date.

  Rulează cu `npm run proba`.
*/

/* ------------------------------------------------------------ grila lunii */

// Septembrie 2026 începe marți și se termină miercuri.
const septembrie = marginileGrilei("2026-09");
assert.equal(septembrie.prima, "2026-09-01");
assert.equal(septembrie.ultima, "2026-09-30");
assert.equal(septembrie.deLa, "2026-08-31", "grila începe lunea dinainte");
assert.equal(septembrie.panaLa, "2026-10-04", "grila se termină duminica de după");

// Februarie 2026 începe chiar duminică — cazul în care se greșește de obicei,
// pentru că duminica e ultima zi a săptămânii la noi, nu prima.
const februarie = marginileGrilei("2026-02");
assert.equal(februarie.deLa, "2026-01-26");
assert.equal(februarie.panaLa, "2026-03-01");

// Iunie 2026 începe luni și se termină marți.
const iunie = marginileGrilei("2026-06");
assert.equal(iunie.deLa, "2026-06-01", "dacă întâi e luni, grila începe chiar atunci");
assert.equal(iunie.panaLa, "2026-07-05");

// Anul bisect: februarie 2028 are 29 de zile.
assert.equal(marginileGrilei("2028-02").ultima, "2028-02-29");

/* -------------------------------------------------- ferestre după-masa */

const ora = (h: number, m = 0) => h * 60 + m;

function eveniment(de_la: number, pana_la: number, extra: Partial<EvenimentGoogle> = {}) {
  return {
    id: `e${de_la}`,
    titlu: "ceva",
    ziua: "2026-09-11",
    toataZiua: false,
    ora: null,
    oraSfarsit: null,
    incepe: de_la,
    seTermina: pana_la,
    ocupa: true,
    ...extra,
  } satisfies EvenimentGoogle;
}

assert.equal(candIncape([], 30), ora(15), "ziua goală: încape de la începutul ferestrei");

assert.equal(
  candIncape([eveniment(ora(9), ora(11))], 30),
  ora(15),
  "ce e dimineața nu atinge după-masa",
);

assert.equal(
  candIncape([eveniment(ora(15), ora(16, 30))], 45),
  ora(16, 30),
  "se începe după ce se termină ce era acolo",
);

assert.equal(
  candIncape([eveniment(ora(16), ora(17))], 30),
  ora(15),
  "dacă încape înainte, nu se împinge mai târziu",
);

assert.equal(
  candIncape([eveniment(ora(16), ora(17))], 90),
  ora(17),
  "dacă nu încape înainte, se sare peste",
);

assert.equal(
  candIncape([eveniment(ora(15), ora(18)), eveniment(ora(18), ora(19))], 40),
  ora(19),
  "după două evenimente lipite mai rămâne o oră bună",
);

assert.equal(
  candIncape([eveniment(ora(15), ora(18)), eveniment(ora(18), ora(19, 30))], 40),
  null,
  "o după-masă plină până seara nu lasă loc",
);

assert.equal(
  candIncape([eveniment(ora(15), ora(19, 15))], 45),
  ora(19, 15),
  "se acceptă și ce se termină fix la 20:00",
);

assert.equal(
  candIncape([eveniment(ora(15), ora(19, 20))], 45),
  null,
  "nu propunem ceva ce s-ar termina după 20:00",
);

assert.equal(
  candIncape([eveniment(ora(15), ora(18), { ocupa: false })], 30),
  ora(15),
  "ce e marcat „Disponibil” în Google nu ocupă",
);

assert.equal(
  candIncape([eveniment(ora(15), ora(18), { toataZiua: true })], 30),
  ora(15),
  "un eveniment de toată ziua — o zi de naștere — nu ocupă după-masa",
);

// Evenimentele nu vin neapărat în ordine din Google când sunt amestecate.
assert.equal(
  candIncape([eveniment(ora(17), ora(18)), eveniment(ora(15), ora(16, 45))], 60),
  ora(18),
  "ordinea în care vin nu contează",
);

assert.equal(
  candIncape([], 30, ora(16, 20)),
  ora(16, 20),
  "pentru ziua de azi pornim de la ceas, nu de la 15:00",
);

assert.equal(
  candIncape([eveniment(ora(16), ora(17))], 30, ora(15, 45)),
  ora(17),
  "ora curentă și ce e în calendar se împing una pe alta",
);

assert.equal(sfertulUrmator(ora(15, 7)), ora(15, 15), "ne apucăm la sfert, nu la 15:07");
assert.equal(sfertulUrmator(ora(15, 15)), ora(15, 15), "un sfert fix rămâne pe loc");

/* --------------------------------------------------------- „de” la numerale */

assert.equal(cuDe(8, "minute"), "8 minute");
assert.equal(cuDe(20, "minute"), "20 de minute");
assert.equal(cuDe(19, "minute"), "19 minute");
assert.equal(cuDe(100, "minute"), "100 de minute");
assert.equal(cuDe(101, "minute"), "101 minute");

console.log("Probele calendarului au trecut.");
