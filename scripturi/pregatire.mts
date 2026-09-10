import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import webpush from "web-push";

/*
  Pregătirea unei instalări noi.

  Generează secretele care nu trebuie să ajungă niciodată în git și scrie
  .env.local. Dacă fișierul există deja, completează doar ce lipsește — poți
  rula scriptul de câte ori vrei fără să pierzi cheile existente.
*/

const cale = join(process.cwd(), ".env.local");
const existent = existsSync(cale) ? await readFile(cale, "utf8") : "";

const valori = new Map<string, string>();
for (const linie of existent.split("\n")) {
  const potrivire = linie.match(/^([A-Z_]+)=(.*)$/);
  if (potrivire) valori.set(potrivire[1], potrivire[2]);
}

function pune(cheie: string, valoare: () => string) {
  if (valori.get(cheie)) return false;
  valori.set(cheie, valoare());
  return true;
}

const noi: string[] = [];

if (pune("DATABASE_URL", () => "file:./local.db")) noi.push("DATABASE_URL");
if (pune("SECRET_SESIUNE", () => randomBytes(32).toString("base64url"))) {
  noi.push("SECRET_SESIUNE");
}

if (!valori.get("VAPID_CHEIE_PUBLICA") || !valori.get("VAPID_CHEIE_PRIVATA")) {
  const chei = webpush.generateVAPIDKeys();
  valori.set("VAPID_CHEIE_PUBLICA", chei.publicKey);
  valori.set("VAPID_CHEIE_PRIVATA", chei.privateKey);
  noi.push("VAPID_CHEIE_PUBLICA", "VAPID_CHEIE_PRIVATA");
}

pune("VAPID_CONTACT", () => "mailto:hac.filip05@gmail.com");
if (pune("CHEIE_CRON", () => randomBytes(24).toString("base64url"))) noi.push("CHEIE_CRON");
pune("GOOGLE_EMAIL_SERVICIU", () => "");
pune("GOOGLE_CHEIE_PRIVATA", () => "");
pune("BUGET_SHEET_ID", () => "1PsVly2ypaJ04C22TjNJ7NIbkCZpUORYzMUKKPe5hLLQ");

const continut =
  "# Generat de `npm run pregatire`. Nu se pune în git.\n" +
  [...valori].map(([cheie, valoare]) => `${cheie}=${valoare}`).join("\n") +
  "\n";

await writeFile(cale, continut, "utf8");

console.log(`.env.local ${existent ? "actualizat" : "creat"}.`);
if (noi.length) console.log(`Chei generate acum: ${noi.join(", ")}`);
console.log("\nUrmătorii pași:");
console.log("  npm run db:generate   # scrie migrările din schemă");
console.log("  npm run db:migrate    # le aplică pe local.db");
console.log("  npm run date:demo     # creează persoanele, categoriile și zonele");
