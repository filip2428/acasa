import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { genereazaCod, hashSecret } from "../lib/autentificare";
import * as schema from "../lib/db/schema";

/*
  Pornirea de la zero: persoanele, categoriile de cumpărături, magazinele, zonele
  casei și treburile lor obișnuite.

  Frecvențele sunt puncte de plecare rezonabile, nu adevăruri — se schimbă din
  aplicație. Rostul lor e ca nimeni să nu fie pus să inventeze de la zero cât de
  des se spală geamurile.

  Rulează o singură dată. Dacă găsește persoane, nu face nimic.
*/

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

const existente = await db.select().from(schema.persoane).limit(1);
if (existente.length > 0) {
  console.log("Baza de date are deja persoane. Nu am schimbat nimic.");
  console.log("Pentru un cod nou: npm run cod:nou -- --id 1");
  client.close();
  process.exit(0);
}

/* -------------------------------------------------------------- persoane */

const coduri: string[] = [];

for (const [nume, esteAdmin] of [
  ["Filip", true],
  ["Ralu", true],
] as const) {
  const cod = genereazaCod();
  await db.insert(schema.persoane).values({
    nume,
    codPublic: cod.codPublic,
    codHash: await hashSecret(cod.secret),
    esteAdmin,
  });
  coduri.push(`  ${nume.padEnd(6)} ${cod.codIntreg}`);
}

/* ------------------------------------------------- categorii și magazine */

// Ordinea e cea în care se parcurge un hypermarket, ca lista să nu te pună
// să traversezi magazinul înainte și înapoi.
const CATEGORII: [nume: string, categorieBuget: string][] = [
  ["Legume și fructe", "Mâncare"],
  ["Pâine și patiserie", "Mâncare"],
  ["Lactate și ouă", "Mâncare"],
  ["Carne și pește", "Mâncare"],
  ["Băcănie", "Mâncare"],
  ["Congelate", "Mâncare"],
  ["Băuturi", "Mâncare"],
  ["Curățenie", "Curatenie"],
  ["Igienă", "Igiena"],
  ["Altele", "Altele"],
];

await db.insert(schema.categorii).values(
  CATEGORII.map(([nume, categorieBuget], i) => ({
    nume,
    categorieBuget,
    ordine: (i + 1) * 10,
  })),
);

await db
  .insert(schema.magazine)
  .values(["Kaufland", "Lidl", "Profi", "Auchan", "Piață"].map((nume) => ({ nume })));

/* ------------------------------------------------------ zonele și treburile */

type Trebuinta = [titlu: string, frecventaZile: number, minute: number, efort: string];

const ZONE: [zona: string, sarcini: Trebuinta[]][] = [
  ["Bucătărie", [
    ["Șters blaturile și aragazul", 2, 10, "usor"],
    ["Spălat pe jos", 7, 15, "mediu"],
    ["Curățat hota și filtrul", 60, 25, "mediu"],
    ["Curățat cuptorul", 90, 40, "greu"],
  ]],
  ["Baie", [
    ["Curățat chiuveta și oglinda", 7, 10, "usor"],
    ["Spălat cada și faianța", 14, 30, "greu"],
    ["Spălat pe jos", 7, 10, "mediu"],
    ["Detartrat capul de duș", 120, 20, "mediu"],
  ]],
  ["Dormitor", [
    ["Schimbat lenjeria", 14, 15, "mediu"],
    ["Aspirat", 7, 15, "mediu"],
    ["Șters praful", 10, 15, "usor"],
  ]],
  ["Living", [
    ["Aspirat", 7, 20, "mediu"],
    ["Șters praful", 10, 15, "usor"],
    ["Spălat geamurile", 90, 45, "greu"],
  ]],
  ["Hol", [
    ["Aspirat și șters pe jos", 7, 10, "usor"],
    ["Aranjat încălțămintea", 30, 15, "usor"],
  ]],
  ["Balcon", [
    ["Măturat", 14, 10, "usor"],
    ["Udat plantele", 3, 5, "usor"],
  ]],
  ["Frigider", [
    ["Aruncat ce a expirat", 7, 10, "usor"],
    ["Spălat rafturile", 60, 30, "mediu"],
  ]],
  ["Congelator", [["Dezghețat și inventariat", 180, 60, "greu"]]],
  ["Debara", []],
  ["Dulapul de haine", []],
  ["Mașină", [
    ["Golit gunoiul din mașină", 21, 10, "usor"],
    ["Spălat mașina", 30, 30, "mediu"],
  ]],
];

for (const [indice, [numeZona, treburi]] of ZONE.entries()) {
  const [zona] = await db
    .insert(schema.zone)
    .values({
      nume: numeZona,
      ordine: (indice + 1) * 10,
      // Rotația lunară de declutter trece prin zone în ordinea asta.
      ordineDeclutter: indice + 1,
    })
    .returning();

  for (const [titlu, frecventaZile, minuteEstimate, efort] of treburi) {
    await db.insert(schema.sarcini).values({
      zonaId: zona.id,
      titlu,
      tip: "curatenie",
      frecventaZile,
      minuteEstimate,
      efort,
      evitaLaMenstruatie: efort === "greu",
    });
  }

  // Fiecare zonă are și trecerea ei prin rotația lunară de declutter.
  await db.insert(schema.sarcini).values({
    zonaId: zona.id,
    titlu: `Declutter: ${numeZona.toLowerCase()}`,
    tip: "declutter",
    frecventaZile: 30 * ZONE.length,
    minuteEstimate: 30,
    efort: "mediu",
    evitaLaMenstruatie: true,
  });
}

/* ------------------------------------------------ câteva produse de pornire */

const toateCategoriile = await db.select().from(schema.categorii);
const idCategorie = (nume: string) => toateCategoriile.find((c) => c.nume === nume)?.id ?? null;

await db.insert(schema.produse).values([
  { nume: "Lapte 3,5%", categorieId: idCategorie("Lactate și ouă"), unitate: "l", pretUltim: 7.5, zileValabilitate: 7 },
  { nume: "Ouă (10 buc)", categorieId: idCategorie("Lactate și ouă"), unitate: "buc", pretUltim: 14.9, zileValabilitate: 21 },
  { nume: "Pâine", categorieId: idCategorie("Pâine și patiserie"), unitate: "buc", pretUltim: 5.5, zileValabilitate: 3 },
  { nume: "Banane", categorieId: idCategorie("Legume și fructe"), unitate: "kg", pretUltim: 8.9, zileValabilitate: 6 },
  { nume: "Piept de pui", categorieId: idCategorie("Carne și pește"), unitate: "kg", pretUltim: 32.9, zileValabilitate: 3 },
  { nume: "Orez", categorieId: idCategorie("Băcănie"), unitate: "kg", pretUltim: 9.9, zileValabilitate: 720 },
  { nume: "Detergent de vase", categorieId: idCategorie("Curățenie"), unitate: "buc", pretUltim: 18.5 },
  { nume: "Hârtie igienică", categorieId: idCategorie("Igienă"), unitate: "buc", pretUltim: 24.9 },
]);

console.log("Gata. Codurile de acces — se afișează o singură dată:\n");
console.log(coduri.join("\n"));
console.log("\nNotează-le acum. Dacă se pierd: npm run cod:nou -- --id 1");

client.close();
