import "server-only";

import { and, desc, eq, isNull, notInArray, sql } from "drizzle-orm";
import { after } from "next/server";

import { db } from "@/lib/db";
import { bugetLunar, tranzactii } from "@/lib/db/schema";
import { lunaCurenta } from "@/lib/formatare";

import { scrieTranzactii } from "./foaie-buget";
import { areGoogle, cereGoogle, codulErorii } from "./google";

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

/** Scrie copia locală a lunii și scoate categoriile care nu mai sunt în foaie. */
async function salveazaCopia(luna: string, randuri: RandBuget[]) {
  for (const rand of randuri) {
    await db
      .insert(bugetLunar)
      .values({ luna, categorie: rand.categorie, planificat: rand.planificat, real: rand.real })
      .onConflictDoUpdate({
        target: [bugetLunar.luna, bugetLunar.categorie],
        set: { planificat: rand.planificat, real: rand.real, actualizatLa: sql`(unixepoch())` },
      });
  }

  // O categorie redenumită în foaie ar rămâne altfel pe ecran la nesfârșit.
  await db.delete(bugetLunar).where(
    and(
      eq(bugetLunar.luna, luna),
      notInArray(
        bugetLunar.categorie,
        randuri.map((r) => r.categorie),
      ),
    ),
  );
}

const dinCopie = (randuri: (typeof bugetLunar.$inferSelect)[]): RandBuget[] =>
  randuri.map((r) => ({
    categorie: r.categorie,
    planificat: r.planificat,
    real: r.real,
    ramas: r.planificat - r.real,
  }));

/**
 * Bugetul lunii, din copia locală. Reîmprospătează din Google dacă e mai veche
 * de o jumătate de oră — sau oricând, cu `fortat` — iar dacă Google nu răspunde,
 * întoarce ce avea.
 *
 * Nu există un ceas care să sincronizeze foaia în fundal: citirea se face atunci
 * când un ecran are nevoie de buget și copia e veche.
 */
export async function bugetulLunii(
  luna = lunaCurenta(),
  { fortat = false }: { fortat?: boolean } = {},
): Promise<RandBuget[]> {
  const local = await db.select().from(bugetLunar).where(eq(bugetLunar.luna, luna));

  const prospat =
    !fortat &&
    local.length > 0 &&
    local.every((r) => Date.now() / 1000 - r.actualizatLa < MINUTE_PROSPATIME * 60);

  if (prospat) return dinCopie(local);

  // Copia e veche, dar există: o arătăm pe loc și recitim foaia după ce ecranul a
  // plecat spre telefon. Altfel „Azi” și „Listă” ar sta o secundă după Google de
  // fiecare dată când trece jumătatea de oră.
  if (!fortat && local.length > 0) {
    const recitire = async () => {
      try {
        const proaspat = await citesteDinSheets(luna);
        if (proaspat.length > 0) await salveazaCopia(luna, proaspat);
      } catch (eroare) {
        console.error("Nu am putut reîmprospăta bugetul din Google Sheets:", eroare);
      }
    };

    try {
      after(recitire);
    } catch {
      // În afara unei cereri (scripturi, probe) nu există „după”: recitim acum.
      await recitire();
      const reinnoit = await db.select().from(bugetLunar).where(eq(bugetLunar.luna, luna));
      return dinCopie(reinnoit);
    }

    return dinCopie(local);
  }

  try {
    const proaspat = await citesteDinSheets(luna);
    if (proaspat.length > 0) {
      await salveazaCopia(luna, proaspat);
      return proaspat;
    }
  } catch (eroare) {
    // Bugetul e informativ; dacă Google e indisponibil, aplicația merge mai departe.
    // Motivul exact îl spune `verificaFoaia`, pe ecranele care au de ce să-l arate.
    console.error("Nu am putut citi bugetul din Google Sheets:", eroare);
  }

  return dinCopie(local);
}

/** Când s-a citit ultima dată din foaie, în secunde. Null dacă niciodată. */
export async function ultimaCitire(luna = lunaCurenta()) {
  const [rand] = await db
    .select({ la: sql<number | null>`max(${bugetLunar.actualizatLa})` })
    .from(bugetLunar)
    .where(eq(bugetLunar.luna, luna));
  return rand?.la ?? null;
}

export type StareaFoii = { ok: true; categorii: number } | { ok: false; motiv: string };

/** Traduce ce a răspuns Google în ce e de reparat, și unde. */
function explicaEroarea(eroare: unknown, luna: string) {
  const cod = codulErorii(eroare);
  const text = eroare instanceof Error ? eroare.message : String(eroare);

  if (/DECODER|PEM|asn1|private key|No key or keyFile/i.test(text)) {
    return "Cheia contului de serviciu nu se poate citi. Pe Vercel, GOOGLE_CHEIE_PRIVATA trebuie copiată întreagă, de la -----BEGIN PRIVATE KEY----- până la -----END PRIVATE KEY-----.";
  }
  if (/invalid_grant|unauthorized_client|invalid_client/i.test(text)) {
    return "Google nu recunoaște contul de serviciu. Verifică pe Vercel că GOOGLE_EMAIL_SERVICIU și GOOGLE_CHEIE_PRIVATA sunt din același fișier JSON.";
  }
  if (cod === 403) {
    return "Google refuză accesul la foaie. Buget_Familial trebuie partajată cu adresa contului de serviciu, ca Editor.";
  }
  if (cod === 404) {
    return "Google nu găsește foaia. Verifică BUGET_SHEET_ID pe Vercel.";
  }
  if (cod === 400 && /parse range/i.test(text)) {
    return `Foaia n-are fila „${luna}”. Se creează singură la prima cheltuială trecută din aplicație, sau o poți duplica din „Șablon Lunar”.`;
  }
  return `Google a răspuns cu o eroare: ${text.slice(0, 180)}`;
}

/**
 * Citește foaia acum, ocolind copia, și spune ce a găsit — sau de ce n-a mers.
 * Stă în spatele butonului „reîmprospătează” și al verificării din Setări.
 */
export async function verificaFoaia(luna = lunaCurenta()): Promise<StareaFoii> {
  if (!areGoogle()) {
    return { ok: false, motiv: "Lipsesc GOOGLE_EMAIL_SERVICIU sau GOOGLE_CHEIE_PRIVATA." };
  }
  if (!process.env.BUGET_SHEET_ID) {
    return { ok: false, motiv: "Lipsește BUGET_SHEET_ID." };
  }

  try {
    const randuri = await citesteDinSheets(luna);
    if (randuri.length === 0) {
      return {
        ok: false,
        motiv: `Am deschis fila „${luna}”, dar n-am găsit tabelul care începe cu „Categorie | Tip”.`,
      };
    }
    await salveazaCopia(luna, randuri);
    return { ok: true, categorii: randuri.length };
  } catch (eroare) {
    console.error("Verificarea foii de buget a picat:", eroare);
    return { ok: false, motiv: explicaEroarea(eroare, luna) };
  }
}

/** O singură categorie, pentru banda de sus din lista de cumpărături. */
export async function categorieDinBuget(nume: string, luna = lunaCurenta()) {
  const toate = await bugetulLunii(luna);
  return toate.find((r) => r.categorie.toLowerCase() === nume.toLowerCase()) ?? null;
}

/* ------------------------------------------------------ scrisul în foaie */

export type CheltuialaNoua = {
  data: string;
  categorie: string;
  suma: number;
  descriere?: string | null;
  sursa?: "manual" | "lista" | "bon";
  listaId?: number | null;
  bonId?: number | null;
};

export type RezultatTrimitere = {
  reusit: boolean;
  cate: number;
  foaieCreata: boolean;
  avertisment: string | null;
  eroare: string | null;
};

/**
 * Trimite cheltuieli în foaia lunii și le ține și local.
 *
 * Le scriem întâi local, cu `trimisLa` gol. Dacă scrierea în foaie reușește, le
 * marcăm trimise; dacă nu, rămân în aplicație cu eroarea lor și pot fi
 * reîncercate — o cheltuială introdusă în magazin nu trebuie să se piardă doar
 * pentru că nu era semnal.
 */
export async function trimiteCheltuieli(
  cheltuieli: CheltuialaNoua[],
  persoanaId: number,
): Promise<RezultatTrimitere> {
  if (cheltuieli.length === 0) {
    return { reusit: true, cate: 0, foaieCreata: false, avertisment: null, eroare: null };
  }

  const luna = cheltuieli[0].data.slice(0, 7);

  const inserate = await db
    .insert(tranzactii)
    .values(
      cheltuieli.map((c) => ({
        luna,
        data: c.data,
        categorie: c.categorie,
        suma: c.suma,
        descriere: c.descriere ?? null,
        sursa: c.sursa ?? "manual",
        listaId: c.listaId ?? null,
        bonId: c.bonId ?? null,
        adaugatDe: persoanaId,
      })),
    )
    .returning({ id: tranzactii.id });

  try {
    const rezultat = await scrieTranzactii(
      luna,
      cheltuieli.map((c) => ({
        data: c.data,
        categorie: c.categorie,
        suma: c.suma,
        descriere: c.descriere,
      })),
    );

    for (const [i, rand] of inserate.entries()) {
      await db
        .update(tranzactii)
        .set({
          trimisLa: Math.floor(Date.now() / 1000),
          randSheet: rezultat.primulRand + i,
          eroare: null,
        })
        .where(eq(tranzactii.id, rand.id));
    }

    // Copia locală a bugetului nu mai e actuală: forțăm recitirea.
    await db.delete(bugetLunar).where(eq(bugetLunar.luna, luna));

    return {
      reusit: true,
      cate: rezultat.cate,
      foaieCreata: rezultat.foaieCreata,
      avertisment: rezultat.avertisment,
      eroare: null,
    };
  } catch (eroare) {
    const mesaj = eroare instanceof Error ? eroare.message : String(eroare);
    for (const rand of inserate) {
      await db.update(tranzactii).set({ eroare: mesaj }).where(eq(tranzactii.id, rand.id));
    }
    console.error("Nu am putut scrie în foaia de buget:", eroare);
    return { reusit: false, cate: 0, foaieCreata: false, avertisment: null, eroare: mesaj };
  }
}

/** Cheltuielile trimise din aplicație, cele mai noi întâi. */
export async function cheltuieliRecente(limita = 20) {
  return db
    .select()
    .from(tranzactii)
    .orderBy(desc(tranzactii.creatLa))
    .limit(limita);
}

/** Cheltuieli rămase netrimise, ca să le putem reîncerca. */
export async function cheltuieliNetrimise() {
  return db.select().from(tranzactii).where(isNull(tranzactii.trimisLa));
}

/** Reîncearcă tot ce n-a plecat încă. */
export async function reincearcaTrimiterea() {
  const ramase = await cheltuieliNetrimise();
  if (ramase.length === 0) return { cate: 0, eroare: null };

  const peLuni = new Map<string, typeof ramase>();
  for (const rand of ramase) {
    peLuni.set(rand.luna, [...(peLuni.get(rand.luna) ?? []), rand]);
  }

  let trimise = 0;
  for (const [luna, randuri] of peLuni) {
    try {
      const rezultat = await scrieTranzactii(
        luna,
        randuri.map((r) => ({
          data: r.data,
          categorie: r.categorie,
          suma: r.suma,
          descriere: r.descriere,
        })),
      );
      for (const [i, rand] of randuri.entries()) {
        await db
          .update(tranzactii)
          .set({
            trimisLa: Math.floor(Date.now() / 1000),
            randSheet: rezultat.primulRand + i,
            eroare: null,
          })
          .where(eq(tranzactii.id, rand.id));
      }
      await db.delete(bugetLunar).where(eq(bugetLunar.luna, luna));
      trimise += randuri.length;
    } catch (eroare) {
      return {
        cate: trimise,
        eroare: eroare instanceof Error ? eroare.message : String(eroare),
      };
    }
  }

  return { cate: trimise, eroare: null };
}
