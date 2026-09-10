import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { articoleLista, categorii, liste, produse } from "@/lib/db/schema";

/*
  Lista de cumpărături curentă.

  Există o singură listă deschisă la un moment dat. Când o finalizezi (ai ieșit
  din magazin), se închide și următorul lucru adăugat deschide una nouă. Listele
  vechi rămân, pentru istoricul de prețuri și pentru ritmul de cumpărare.
*/

export async function listaCurenta() {
  const [existenta] = await db
    .select()
    .from(liste)
    .where(isNull(liste.finalizataLa))
    .orderBy(desc(liste.creatLa))
    .limit(1);

  if (existenta) return existenta;

  const [noua] = await db.insert(liste).values({ nume: "Cumpărături" }).returning();
  return noua;
}

export type ArticolAfisat = {
  id: number;
  nume: string;
  cantitate: number;
  unitate: string;
  pretEstimat: number | null;
  bifat: boolean;
  produsId: number | null;
  pozaUrl: string | null;
  categorieId: number | null;
  categorieNume: string;
  categorieOrdine: number;
};

export async function articoleleListei(listaId: number): Promise<ArticolAfisat[]> {
  const randuri = await db
    .select({
      id: articoleLista.id,
      text: articoleLista.text,
      cantitate: articoleLista.cantitate,
      unitate: articoleLista.unitate,
      pretEstimat: articoleLista.pretEstimat,
      bifat: articoleLista.bifat,
      produsId: articoleLista.produsId,
      numeProdus: produse.nume,
      pozaUrl: produse.pozaUrl,
      categorieId: categorii.id,
      categorieNume: categorii.nume,
      categorieOrdine: categorii.ordine,
    })
    .from(articoleLista)
    .leftJoin(produse, eq(articoleLista.produsId, produse.id))
    .leftJoin(categorii, eq(produse.categorieId, categorii.id))
    .where(eq(articoleLista.listaId, listaId))
    .orderBy(asc(articoleLista.adaugatLa));

  return randuri.map((r) => ({
    id: r.id,
    nume: r.numeProdus ?? r.text ?? "Fără nume",
    cantitate: r.cantitate,
    unitate: r.unitate,
    pretEstimat: r.pretEstimat,
    bifat: r.bifat,
    produsId: r.produsId,
    pozaUrl: r.pozaUrl,
    categorieId: r.categorieId,
    categorieNume: r.categorieNume ?? "Altele",
    categorieOrdine: r.categorieOrdine ?? 999,
  }));
}

/** Grupează pe categorii, în ordinea în care le parcurgem prin magazin. */
export function peCategorii(articole: ArticolAfisat[]) {
  const grupe = new Map<string, { ordine: number; articole: ArticolAfisat[] }>();

  for (const articol of articole) {
    const grupa = grupe.get(articol.categorieNume) ?? {
      ordine: articol.categorieOrdine,
      articole: [],
    };
    grupa.articole.push(articol);
    grupe.set(articol.categorieNume, grupa);
  }

  return [...grupe.entries()]
    .sort((a, b) => a[1].ordine - b[1].ordine || a[0].localeCompare(b[0], "ro"))
    .map(([nume, grupa]) => ({ nume, articole: grupa.articole }));
}

/**
 * Totalul coșului. Îl împărțim în „bifat” (ce e deja în coș) și „rămas”,
 * pentru că în magazin întrebarea reală e cât ai strâns până acum.
 */
export function totaluri(articole: ArticolAfisat[]) {
  let inCos = 0;
  let ramas = 0;
  let faraPret = 0;

  for (const articol of articole) {
    if (articol.pretEstimat == null) {
      if (!articol.bifat) faraPret += 1;
      continue;
    }
    const valoare = articol.pretEstimat * articol.cantitate;
    if (articol.bifat) inCos += valoare;
    else ramas += valoare;
  }

  return { inCos, ramas, total: inCos + ramas, faraPret };
}

/** Produse propuse la scriere, potrivite după nume. */
export async function cautaProduse(termen: string, limita = 8) {
  const curat = termen.trim().toLowerCase();
  if (curat.length < 2) return [];

  const toate = await db
    .select({
      id: produse.id,
      nume: produse.nume,
      unitate: produse.unitate,
      cantitateImplicita: produse.cantitateImplicita,
      pretUltim: produse.pretUltim,
      pozaUrl: produse.pozaUrl,
    })
    .from(produse)
    .where(eq(produse.arhivat, false))
    .orderBy(asc(produse.nume));

  // Potrivirile de la începutul numelui urcă înaintea celor din mijloc.
  return toate
    .map((p) => ({ p, pozitie: p.nume.toLowerCase().indexOf(curat) }))
    .filter(({ pozitie }) => pozitie >= 0)
    .sort((a, b) => a.pozitie - b.pozitie || a.p.nume.localeCompare(b.p.nume, "ro"))
    .slice(0, limita)
    .map(({ p }) => p);
}

export async function categoriileActive() {
  return db
    .select()
    .from(categorii)
    .where(eq(categorii.activ, true))
    .orderBy(asc(categorii.ordine), asc(categorii.nume));
}

export async function magazinulListei(listaId: number) {
  const [rand] = await db
    .select({ magazinId: liste.magazinId })
    .from(liste)
    .where(and(eq(liste.id, listaId)))
    .limit(1);
  return rand?.magazinId ?? null;
}
