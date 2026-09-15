import "server-only";

import { and, asc, eq, max } from "drizzle-orm";

import { db } from "@/lib/db";
import { articoleLista, categorii, produse } from "@/lib/db/schema";

/*
  Categoriile de cumpărături.

  Ele dau ordinea listei prin magazin și spun în ce categorie din buget intră
  cumpărăturile la închiderea listei. Se pot face din Catalog, din fișa unui
  produs sau direct de pe un rând din listă — acolo îți dai seama că îți lipsește
  una, cu coșul în mână.
*/

function laFel(a: string, b: string) {
  return a.localeCompare(b, "ro", { sensitivity: "base" }) === 0;
}

/**
 * Face o categorie nouă, la coada magazinului. Dacă există deja una cu același
 * nume — și cele scoase — o întoarce pe aceea, ca două apăsări să nu facă dubluri.
 */
export async function creeazaCategorie(nume: string, categorieBuget: string | null = null) {
  const curat = nume.trim().replace(/\s+/g, " ");
  if (!curat) throw new Error("Categoria are nevoie de un nume.");

  const toate = await db.select().from(categorii);
  const existenta = toate.find((c) => laFel(c.nume, curat));
  if (existenta) {
    if (!existenta.activ) {
      await db.update(categorii).set({ activ: true }).where(eq(categorii.id, existenta.id));
    }
    return { ...existenta, activ: true };
  }

  // „Altele” rămâne ultima: noile categorii intră înaintea ei.
  const altele = toate.find((c) => c.activ && laFel(c.nume, "Altele"));
  const [{ ultima }] = await db
    .select({ ultima: max(categorii.ordine) })
    .from(categorii)
    .where(eq(categorii.activ, true));

  let ordine = (ultima ?? 0) + 10;
  if (altele) {
    ordine = altele.ordine;
    await db.update(categorii).set({ ordine: altele.ordine + 10 }).where(eq(categorii.id, altele.id));
  }

  const numeFrumos = curat.charAt(0).toLocaleUpperCase("ro") + curat.slice(1);
  const [noua] = await db
    .insert(categorii)
    .values({ nume: numeFrumos, ordine, categorieBuget })
    .returning();
  return noua;
}

export async function actualizeazaCategorie(
  id: number,
  schimbari: { nume?: string; categorieBuget?: string | null },
) {
  const valori: { nume?: string; categorieBuget?: string | null } = {};
  if (schimbari.nume != null) {
    const curat = schimbari.nume.trim().replace(/\s+/g, " ");
    if (!curat) throw new Error("Categoria are nevoie de un nume.");
    valori.nume = curat;
  }
  if (schimbari.categorieBuget !== undefined) valori.categorieBuget = schimbari.categorieBuget;
  if (Object.keys(valori).length === 0) return;

  await db.update(categorii).set(valori).where(eq(categorii.id, id));
}

/** Urcă sau coboară o categorie cu un loc în drumul prin magazin. */
export async function mutaCategorie(id: number, directie: -1 | 1) {
  const active = await db
    .select({ id: categorii.id, ordine: categorii.ordine })
    .from(categorii)
    .where(eq(categorii.activ, true))
    .orderBy(asc(categorii.ordine), asc(categorii.nume));

  const pozitie = active.findIndex((c) => c.id === id);
  const vecina = active[pozitie + directie];
  if (pozitie < 0 || !vecina) return;

  // Renumerotăm tot, din 10 în 10: ordinile egale n-ar avea ce schimba între ele.
  const noua = [...active];
  [noua[pozitie], noua[pozitie + directie]] = [noua[pozitie + directie], noua[pozitie]];
  for (const [i, c] of noua.entries()) {
    const ordine = (i + 1) * 10;
    if (c.ordine !== ordine) {
      await db.update(categorii).set({ ordine }).where(eq(categorii.id, c.id));
    }
  }
}

/**
 * Scoate o categorie. N-o ștergem, ca listele vechi să rămână întregi; produsele
 * ei rămân fără categorie și apar la „Altele” până le muți.
 */
export async function scoateCategorie(id: number) {
  await db.update(produse).set({ categorieId: null }).where(eq(produse.categorieId, id));
  await db.update(categorii).set({ activ: false }).where(eq(categorii.id, id));
}

/** Câte produse are fiecare categorie, ca să știi ce scoți. */
export async function produsePeCategorii() {
  const randuri = await db
    .select({ categorieId: produse.categorieId })
    .from(produse)
    .where(eq(produse.arhivat, false));
  const cate = new Map<number, number>();
  for (const r of randuri) {
    if (r.categorieId != null) cate.set(r.categorieId, (cate.get(r.categorieId) ?? 0) + 1);
  }
  return cate;
}

/**
 * Pune un articol de pe listă într-o categorie. Categoria stă pe produs, nu pe
 * articol — așa data viitoare vine singur la locul lui. Un articol scris ca text
 * primește deci un produs în catalog, cu același nume.
 */
export async function categorieArticol(articolId: number, categorieId: number | null) {
  const [articol] = await db
    .select({ produsId: articoleLista.produsId, text: articoleLista.text, unitate: articoleLista.unitate })
    .from(articoleLista)
    .where(eq(articoleLista.id, articolId))
    .limit(1);
  if (!articol) return;

  if (articol.produsId) {
    await db.update(produse).set({ categorieId }).where(eq(produse.id, articol.produsId));
    return;
  }

  const nume = articol.text?.trim();
  if (!nume) return;

  const inCatalog = await db
    .select({ id: produse.id, nume: produse.nume })
    .from(produse)
    .where(and(eq(produse.arhivat, false)));
  let produsId = inCatalog.find((p) => laFel(p.nume, nume))?.id;

  if (produsId) {
    await db.update(produse).set({ categorieId }).where(eq(produse.id, produsId));
  } else {
    const [nou] = await db
      .insert(produse)
      .values({
        nume: nume.charAt(0).toLocaleUpperCase("ro") + nume.slice(1),
        categorieId,
        unitate: articol.unitate,
      })
      .returning({ id: produse.id });
    produsId = nou.id;
  }

  await db.update(articoleLista).set({ produsId, text: null }).where(eq(articoleLista.id, articolId));
}
