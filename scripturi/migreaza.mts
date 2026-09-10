import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

/*
  Aplică migrările din `drizzle/` pe baza de date configurată.
  Local scrie în local.db; cu DATABASE_URL setat pe Turso, scrie acolo.
*/

const url = process.env.DATABASE_URL ?? "file:./local.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log(`Migrări aplicate pe ${url}`);
client.close();
