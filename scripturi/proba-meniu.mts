import assert from "node:assert/strict";

import {
  desparteCantitatea,
  motivulPropunerii,
  scorulRetetei,
  type DateDeScor,
} from "../lib/servicii/socoteli-meniu.ts";

/*
  Probe pentru alegerea meniului.

  Notele nu contează în sine — contează ordinea pe care o produc. De aia probele
  de mai jos compară rețete între ele, nu verifică cifre exacte: dacă mâine
  schimbăm ponderile, regulile trebuie să rămână aceleași.

  Rulează cu `npm run proba`.
*/

const obisnuita: DateDeScor = {
  lipsuri: 0,
  necesare: 5,
  expiraInEa: 0,
  zileDeLaUltimaGatire: null,
  favorit: false,
  minuteTotal: 30,
  searaOcupata: false,
};

const cu = (schimbari: Partial<DateDeScor>) => ({ ...obisnuita, ...schimbari });

/* -------------------------------------------- ce expiră bate orice altceva */

assert.ok(
  scorulRetetei(cu({ expiraInEa: 1, lipsuri: 2 })) > scorulRetetei(cu({ lipsuri: 0 })),
  "o rețetă care salvează ceva de la expirat trece înaintea uneia comode",
);

assert.ok(
  scorulRetetei(cu({ expiraInEa: 2 })) > scorulRetetei(cu({ expiraInEa: 1 })),
  "două lucruri salvate bat unul",
);

assert.equal(
  scorulRetetei(cu({ expiraInEa: 5 })),
  scorulRetetei(cu({ expiraInEa: 3 })),
  "peste trei lucruri care expiră, nu mai adăugăm: e deja prima",
);

/* ------------------------------------------------- ce se poate găti acum */

assert.ok(
  scorulRetetei(cu({ lipsuri: 0 })) > scorulRetetei(cu({ lipsuri: 3 })),
  "ce ai în casă trece înaintea a ce trebuie cumpărat",
);

assert.ok(
  scorulRetetei(cu({ lipsuri: 0, necesare: 0 })) > 0,
  "o rețetă fără ingrediente legate de catalog nu e penalizată",
);

/* ------------------------------------------------------------ varietatea */

assert.ok(
  scorulRetetei(cu({ zileDeLaUltimaGatire: 0 })) < scorulRetetei(cu({ zileDeLaUltimaGatire: null })),
  "ce s-a gătit azi nu se propune iar",
);

assert.ok(
  scorulRetetei(cu({ zileDeLaUltimaGatire: 12 })) === scorulRetetei(cu({ zileDeLaUltimaGatire: null })),
  "după zece zile, nu mai contează că a fost gătită",
);

assert.ok(
  scorulRetetei(cu({ zileDeLaUltimaGatire: 8 })) > scorulRetetei(cu({ zileDeLaUltimaGatire: 2 })),
  "cu cât a trecut mai mult, cu atât e mai potrivită",
);

/* ------------------------------------------------------- seara ocupată */

assert.ok(
  scorulRetetei(cu({ searaOcupata: true, minuteTotal: 120 })) <
    scorulRetetei(cu({ searaOcupata: true, minuteTotal: 20 })),
  "într-o seară plină, scurt bate lung",
);

assert.equal(
  scorulRetetei(cu({ searaOcupata: false, minuteTotal: 120 })),
  scorulRetetei(cu({ searaOcupata: false, minuteTotal: 20 })),
  "într-o seară liberă, durata nu contează",
);

assert.ok(
  scorulRetetei(cu({ searaOcupata: true, lipsuri: 2 })) <
    scorulRetetei(cu({ searaOcupata: false, lipsuri: 2 })),
  "într-o seară plină nu te trimitem și la magazin",
);

/* ------------------------------------------------------------- motivele */

assert.equal(
  motivulPropunerii(cu({ expiraInEa: 1, lipsuri: 2 }), {
    primulCareExpira: { nume: "Iaurt grecesc", zile: 1 },
    primaLipsa: "Ceapă",
  }),
  "Folosește iaurt grecesc, expiră mâine",
  "expirarea se spune prima, chiar dacă lipsesc lucruri",
);

assert.equal(
  motivulPropunerii(cu({ expiraInEa: 1 }), { primulCareExpira: { nume: "Smântână", zile: 0 } }),
  "Folosește smântână, expiră azi",
);

assert.equal(
  motivulPropunerii(cu({ expiraInEa: 1 }), { primulCareExpira: { nume: "Lapte", zile: 3 } }),
  "Folosește lapte, mai are 3 zile",
);

assert.equal(motivulPropunerii(cu({ lipsuri: 0 }), {}), "Ai tot ce trebuie în casă");

assert.equal(
  motivulPropunerii(cu({ lipsuri: 0, searaOcupata: true, minuteTotal: 20 }), {}),
  "Ai tot ce trebuie și e gata în 20 de minute",
);

assert.equal(
  motivulPropunerii(cu({ lipsuri: 1 }), { primaLipsa: "Piept de pui" }),
  "Îți lipsește doar piept de pui",
);

assert.equal(motivulPropunerii(cu({ lipsuri: 3 }), {}), "Îți lipsesc 3 lucruri");

/* --------------------------------------------- cantitatea din ingredient */

assert.deepEqual(desparteCantitatea("500 g piept de pui"), {
  cantitate: 500,
  unitate: "g",
  nume: "piept de pui",
});

assert.deepEqual(desparteCantitatea("2 cepe"), {
  cantitate: 2,
  unitate: null,
  nume: "cepe",
});

assert.deepEqual(desparteCantitatea("1,5 l lapte"), {
  cantitate: 1.5,
  unitate: "l",
  nume: "lapte",
});

assert.deepEqual(desparteCantitatea("3 linguri de miere"), {
  cantitate: 3,
  unitate: "linguri",
  nume: "miere",
});

assert.deepEqual(
  desparteCantitatea("sare"),
  { cantitate: null, unitate: null, nume: "sare" },
  "fără cifră, tot textul e numele",
);

assert.deepEqual(
  desparteCantitatea("piept de pui"),
  { cantitate: null, unitate: null, nume: "piept de pui" },
  "„de” din mijlocul numelui nu se pierde",
);

console.log("Probele meniului au trecut.");
