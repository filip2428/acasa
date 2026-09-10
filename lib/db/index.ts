import "server-only";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

/*
  Un singur client de bază de date pentru tot serverul.

  Local scrie în `local.db`; în producție aceleași apeluri merg la Turso, prin
  același driver — se schimbă doar variabilele de mediu.

  În dezvoltare Next reîncarcă modulele la fiecare salvare, așa că păstrăm
  clientul pe `globalThis`, altfel s-ar deschide câte o conexiune la fiecare
  modificare de fișier.
*/

const url = process.env.DATABASE_URL ?? "file:./local.db";

const global = globalThis as unknown as {
  clientLibsql?: ReturnType<typeof createClient>;
};

const client =
  global.clientLibsql ??
  createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

if (process.env.NODE_ENV !== "production") global.clientLibsql = client;

export const db = drizzle(client, { schema });
export { schema };
