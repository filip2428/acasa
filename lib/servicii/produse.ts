import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { categorii, magazine, preturi, produse } from "@/lib/db/schema";
import { zileIntre } from "@/lib/formatare";

/*
  Catalogul de produse și căutarea după codul de bare.
*/

export type ProdusDinCatalog = {
  id: number;
  nume: string;
  unitate: string;
  cantitateImplicita: number;
  codBare: string | null;
  pozaUrl: string | null;
  pretUltim: number | null;
  zileValabilitate: number | null;
  categorieId: number | null;
  categorieNume: string | null;
};

export async function catalog(): Promise<ProdusDinCatalog[]> {
  const randuri = await db
    .select({
      id: produse.id,
      nume: produse.nume,
      unitate: produse.unitate,
      cantitateImplicita: produse.cantitateImplicita,
      codBare: produse.codBare,
      pozaUrl: produse.pozaUrl,
      pretUltim: produse.pretUltim,
      zileValabilitate: produse.zileValabilitate,
      categorieId: categorii.id,
      categorieNume: categorii.nume,
    })
    .from(produse)
    .leftJoin(categorii, eq(produse.categorieId, categorii.id))
    .where(eq(produse.arhivat, false));

  // SQLite nu știe alfabetul românesc: „Pâine” i-ar cădea după „Piept”.
  return randuri.sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
}

export async function produsDupaCodBare(codBare: string) {
  const [rand] = await db
    .select()
    .from(produse)
    .where(eq(produse.codBare, codBare))
    .limit(1);
  return rand ?? null;
}

export async function istoricPreturi(produsId: number, limita = 12) {
  return db
    .select({
      pret: preturi.pret,
      data: preturi.data,
      sursa: preturi.sursa,
      magazin: magazine.nume,
    })
    .from(preturi)
    .leftJoin(magazine, eq(preturi.magazinId, magazine.id))
    .where(eq(preturi.produsId, produsId))
    .orderBy(desc(preturi.data))
    .limit(limita);
}

/* ------------------------------------------------------- Open Food Facts */

/*
  Open Food Facts e o bază deschisă de produse alimentare, cu acoperire bună pe
  retailul din România. Ne dă numele și poza pornind de la codul de bare, ca
  adăugarea unui produs să dureze trei secunde, nu trei minute de tastat.

  Nu e obligatorie: dacă produsul lipsește sau serviciul nu răspunde, rămâne
  completarea manuală.
*/

export type ProdusGasit = {
  nume: string;
  pozaUrl: string | null;
  cantitate: string | null;
  marca: string | null;
};

export async function cautaInOpenFoodFacts(codBare: string): Promise<ProdusGasit | null> {
  const campuri = "product_name,product_name_ro,brands,image_front_small_url,quantity";
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codBare)}.json?fields=${campuri}`;

  try {
    const raspuns = await fetch(url, {
      headers: { "User-Agent": "Acasa/0.1 (aplicatie de uz casnic)" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!raspuns.ok) return null;

    const date = (await raspuns.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_ro?: string;
        brands?: string;
        image_front_small_url?: string;
        quantity?: string;
      };
    };

    const p = date.product;
    if (date.status !== 1 || !p) return null;

    const nume = (p.product_name_ro || p.product_name || "").trim();
    if (!nume) return null;

    return {
      nume,
      pozaUrl: p.image_front_small_url ?? null,
      cantitate: p.quantity ?? null,
      marca: p.brands?.split(",")[0]?.trim() ?? null,
    };
  } catch {
    // Fără internet sau serviciu picat: completăm manual, nu blocăm scanarea.
    return null;
  }
}

/** Recalculează la câte zile se cumpără de obicei produsul, din ultimele achiziții. */
export async function actualizeazaRitmul(produsId: number) {
  const date = await db
    .select({ data: preturi.data })
    .from(preturi)
    .where(eq(preturi.produsId, produsId))
    .orderBy(desc(preturi.data))
    .limit(8);

  if (date.length < 3) return;

  const zile: number[] = [];
  for (let i = 0; i < date.length - 1; i++) {
    const diferenta = zileIntre(date[i + 1].data, date[i].data);
    if (diferenta > 0 && diferenta < 200) zile.push(diferenta);
  }

  if (zile.length < 2) return;

  // Mediana, nu media: o singură cumpărătură ieșită din tipar nu trebuie să
  // mute ritmul cu două săptămâni.
  zile.sort((a, b) => a - b);
  const mijloc = Math.floor(zile.length / 2);
  const mediana =
    zile.length % 2 ? zile[mijloc] : (zile[mijloc - 1] + zile[mijloc]) / 2;

  await db.update(produse).set({ ritmZile: mediana }).where(eq(produse.id, produsId));
}

export async function numaraProduse() {
  const [rand] = await db
    .select({ cate: sql<number>`count(*)` })
    .from(produse)
    .where(eq(produse.arhivat, false));
  return rand?.cate ?? 0;
}
