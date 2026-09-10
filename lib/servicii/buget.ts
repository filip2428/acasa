import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { bugetLunar } from "@/lib/db/schema";
import { lunaCurenta } from "@/lib/formatare";

import { areGoogle, cereGoogle } from "./google";

/*
  Citirea bugetului din foaia Buget_Familial.

  Foaia rămâne sursa de adevăr — aplicația nu ține un buget paralel. Structura pe
  care ne bazăm, așa cum e ea în document:

    …
    BUGET CHELTUIELI
    Categorie | Tip | Planificat | Real (Local) | Diferență | Note
    Mâncare   | Necesară | 1800 | 1240 | 560 |
    …
    Total Cheltuieli | …

  Citim cu `UNFORMATTED_VALUE`, deci primim numere, nu „1.240,00 lei” de despărțit
  în bucăți. Rezultatul se ține în tabelul `buget_lunar` ca să nu interogăm Google
  la fiecare deschidere de ecran.
*/

const MINUTE_PROSPATIME = 30;

export type RandBuget = {
  categorie: string;
  planificat: number;
  real: number;
  ramas: number;
};

type RaspunsValori = { values?: unknown[][] };

function numar(valoare: unknown) {
  if (typeof valoare === "number") return valoare;
  if (typeof valoare === "string" && valoare.trim() !== "") {
    // Rezervă, dacă foaia întoarce totuși text: „1.240,50 lei”.
    const curat = valoare.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(curat);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

async function citesteDinSheets(luna: string): Promise<RandBuget[]> {
  const sheetId = process.env.BUGET_SHEET_ID;
  if (!sheetId || !areGoogle()) return [];

  const interval = encodeURIComponent(`${luna}!A1:F80`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${interval}` +
    `?valueRenderOption=UNFORMATTED_VALUE`;

  const raspuns = await cereGoogle<RaspunsValori>(url);
  const randuri = raspuns.values ?? [];

  const inceput = randuri.findIndex(
    (r) => String(r?.[0] ?? "").trim() === "Categorie" && String(r?.[1] ?? "").trim() === "Tip",
  );
  if (inceput < 0) return [];

  const rezultat: RandBuget[] = [];

  for (const rand of randuri.slice(inceput + 1)) {
    const categorie = String(rand?.[0] ?? "").trim();
    if (!categorie) continue;
    if (categorie.toLowerCase().startsWith("total")) break;

    const planificat = numar(rand?.[2]);
    const real = numar(rand?.[3]);
    rezultat.push({ categorie, planificat, real, ramas: planificat - real });
  }

  return rezultat;
}

/**
 * Bugetul lunii, din copia locală. Reîmprospătează din Google dacă e mai veche
 * de o jumătate de oră, iar dacă Google nu răspunde, întoarce ce avea.
 */
export async function bugetulLunii(luna = lunaCurenta()): Promise<RandBuget[]> {
  const local = await db.select().from(bugetLunar).where(eq(bugetLunar.luna, luna));

  const prospat =
    local.length > 0 &&
    local.every(
      (r) => Date.now() / 1000 - r.actualizatLa < MINUTE_PROSPATIME * 60,
    );

  if (prospat) {
    return local.map((r) => ({
      categorie: r.categorie,
      planificat: r.planificat,
      real: r.real,
      ramas: r.planificat - r.real,
    }));
  }

  try {
    const proaspat = await citesteDinSheets(luna);
    if (proaspat.length > 0) {
      for (const rand of proaspat) {
        await db
          .insert(bugetLunar)
          .values({
            luna,
            categorie: rand.categorie,
            planificat: rand.planificat,
            real: rand.real,
          })
          .onConflictDoUpdate({
            target: [bugetLunar.luna, bugetLunar.categorie],
            set: {
              planificat: rand.planificat,
              real: rand.real,
              actualizatLa: sql`(unixepoch())`,
            },
          });
      }
      return proaspat;
    }
  } catch (eroare) {
    // Bugetul e informativ; dacă Google e indisponibil, aplicația merge mai departe.
    console.error("Nu am putut citi bugetul din Google Sheets:", eroare);
  }

  return local.map((r) => ({
    categorie: r.categorie,
    planificat: r.planificat,
    real: r.real,
    ramas: r.planificat - r.real,
  }));
}

/** O singură categorie, pentru banda de sus din lista de cumpărături. */
export async function categorieDinBuget(nume: string, luna = lunaCurenta()) {
  const toate = await bugetulLunii(luna);
  return toate.find((r) => r.categorie.toLowerCase() === nume.toLowerCase()) ?? null;
}
