import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";

import { genereazaCod, hashSecret } from "../lib/autentificare";
import * as schema from "../lib/db/schema";

/*
  Generează un cod de acces nou pentru o persoană, dacă cel vechi s-a pierdut.
  Codul vechi încetează să funcționeze imediat.

  Folosire: npm run cod:nou -- --id 1
*/

const indice = process.argv.indexOf("--id");
const id = indice > -1 ? Number(process.argv[indice + 1]) : NaN;

if (!Number.isInteger(id)) {
  console.error("Lipsește id-ul persoanei. Exemplu: npm run cod:nou -- --id 1");
  process.exit(1);
}

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

const [persoana] = await db
  .select()
  .from(schema.persoane)
  .where(eq(schema.persoane.id, id))
  .limit(1);

if (!persoana) {
  console.error(`Nu există persoana cu id-ul ${id}.`);
  const toate = await db.select().from(schema.persoane);
  if (toate.length) {
    console.error("Persoane existente:");
    for (const p of toate) console.error(`  ${p.id}: ${p.nume}`);
  }
  client.close();
  process.exit(1);
}

const cod = genereazaCod();
await db
  .update(schema.persoane)
  .set({ codPublic: cod.codPublic, codHash: await hashSecret(cod.secret) })
  .where(eq(schema.persoane.id, id));

console.log(`Cod nou pentru ${persoana.nume}: ${cod.codIntreg}`);
console.log("Cel vechi nu mai merge. Se afișează o singură dată.");

client.close();
