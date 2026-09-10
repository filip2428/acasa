import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/*
  Preia datele contului de serviciu Google dintr-un fișier JSON descărcat din
  Google Cloud și le scrie în .env.local.

  Rostul scriptului e să scutească de partea enervantă: cheia privată e un text
  pe mai multe rânduri, iar copiat de mână într-un fișier .env ajunge aproape
  întotdeauna stricat.

  Folosire:  npm run google -- C:\\Users\\...\\acasa-1234.json
*/

const cale = process.argv[2];

if (!cale) {
  console.error("Lipsește fișierul JSON. Exemplu:");
  console.error("  npm run google -- C:\\Users\\hacfi\\Downloads\\acasa-1234.json");
  process.exit(1);
}

const caleJson = resolve(cale);
if (!existsSync(caleJson)) {
  console.error(`Nu găsesc fișierul: ${caleJson}`);
  process.exit(1);
}

const json = JSON.parse(await readFile(caleJson, "utf8")) as {
  type?: string;
  client_email?: string;
  private_key?: string;
};

if (json.type !== "service_account" || !json.client_email || !json.private_key) {
  console.error(
    "Fișierul nu pare a fi cheia unui cont de serviciu.\n" +
      "Trebuie cel descărcat din Google Cloud → Conturi de serviciu → Chei → JSON.",
  );
  process.exit(1);
}

const caleEnv = join(process.cwd(), ".env.local");
if (!existsSync(caleEnv)) {
  console.error("Lipsește .env.local. Rulează întâi `npm run pregatire`.");
  process.exit(1);
}

const valori = new Map<string, string>();
for (const linie of (await readFile(caleEnv, "utf8")).split("\n")) {
  const potrivire = linie.match(/^([A-Z_]+)=(.*)$/);
  if (potrivire) valori.set(potrivire[1], potrivire[2]);
}

valori.set("GOOGLE_EMAIL_SERVICIU", json.client_email);
// Cheia intră pe un singur rând, cu „\n” scris ca text; aplicația o desface la loc.
valori.set("GOOGLE_CHEIE_PRIVATA", `"${json.private_key.replace(/\n/g, "\\n")}"`);

await writeFile(
  caleEnv,
  "# Generat de `npm run pregatire`. Nu se pune în git.\n" +
    [...valori].map(([cheie, valoare]) => `${cheie}=${valoare}`).join("\n") +
    "\n",
  "utf8",
);

console.log("Gata. .env.local are acum contul de serviciu.\n");
console.log("Mai rămâne să dai acces la ce trebuie citit, din Google:");
console.log(`  1. Foaia Buget_Familial → Partajează → ${json.client_email} → Editor`);
console.log(`  2. Calendarul fiecăruia → Setări → Partajează cu anumite persoane →`);
console.log(`     ${json.client_email} → „Vizualizați toate detaliile evenimentelor”`);
console.log("\nApoi repornește serverul: npm run dev");
