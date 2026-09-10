"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { articoleLista, liste, magazine, produse } from "@/lib/db/schema";
import { azi } from "@/lib/formatare";
import { trimiteCheltuieli } from "@/lib/servicii/buget";
import { areGoogle } from "@/lib/servicii/google";
import { cautaProduse, listaCurenta, sumePentruBuget } from "@/lib/servicii/lista";
import { ceruteSesiune } from "@/lib/sesiune";

/*
  Acțiunile listei de cumpărături.

  Sunt funcții de server apelate direct din componente, nu rute de API: lista se
  bifează cu degetul, articol cu articol, iar un <form> clasic ar reîncărca
  pagina și ar pierde poziția în listă.
*/

export async function adaugaArticol(intrare: {
  produsId?: number | null;
  text?: string | null;
  cantitate?: number;
  unitate?: string;
}) {
  const sesiune = await ceruteSesiune();
  const lista = await listaCurenta();

  let unitate = intrare.unitate ?? "buc";
  let pretEstimat: number | null = null;

  if (intrare.produsId) {
    const [produs] = await db
      .select()
      .from(produse)
      .where(eq(produse.id, intrare.produsId))
      .limit(1);
    if (produs) {
      unitate = intrare.unitate ?? produs.unitate;
      pretEstimat = produs.pretUltim;
    }
  }

  await db.insert(articoleLista).values({
    listaId: lista.id,
    produsId: intrare.produsId ?? null,
    text: intrare.produsId ? null : (intrare.text?.trim() || null),
    cantitate: intrare.cantitate ?? 1,
    unitate,
    pretEstimat,
    adaugatDe: sesiune.persoanaId,
  });

  revalidatePath("/lista");
  revalidatePath("/");
}

export async function comutaBifat(articolId: number, bifat: boolean) {
  const sesiune = await ceruteSesiune();

  await db
    .update(articoleLista)
    .set({
      bifat,
      bifatDe: bifat ? sesiune.persoanaId : null,
      bifatLa: bifat ? Math.floor(Date.now() / 1000) : null,
    })
    .where(eq(articoleLista.id, articolId));

  revalidatePath("/lista");
  revalidatePath("/");
}

export async function schimbaCantitatea(articolId: number, cantitate: number) {
  await ceruteSesiune();
  if (cantitate <= 0) return stergeArticol(articolId);

  await db
    .update(articoleLista)
    .set({ cantitate })
    .where(eq(articoleLista.id, articolId));

  revalidatePath("/lista");
}

export async function schimbaPretul(articolId: number, pret: number | null) {
  await ceruteSesiune();

  await db
    .update(articoleLista)
    .set({ pretEstimat: pret })
    .where(eq(articoleLista.id, articolId));

  revalidatePath("/lista");
}

export async function stergeArticol(articolId: number) {
  await ceruteSesiune();
  await db.delete(articoleLista).where(eq(articoleLista.id, articolId));
  revalidatePath("/lista");
  revalidatePath("/");
}

export async function golesteBifate() {
  await ceruteSesiune();
  const lista = await listaCurenta();
  await db
    .delete(articoleLista)
    .where(and(eq(articoleLista.listaId, lista.id), eq(articoleLista.bifat, true)));
  revalidatePath("/lista");
  revalidatePath("/");
}

export async function alegeMagazinul(magazinId: number | null) {
  await ceruteSesiune();
  const lista = await listaCurenta();
  await db.update(liste).set({ magazinId }).where(eq(liste.id, lista.id));
  revalidatePath("/lista");
}

/**
 * Închide lista curentă. Prețurile bifate intră în istoric, produsele își
 * actualizează ultimul preț, iar cumpărăturile pot pleca direct în buget —
 * împărțite pe categorii, ceea ce de mână n-ar face nimeni.
 */
export async function finalizeazaLista(totalReal: number | null, inBuget = true) {
  const sesiune = await ceruteSesiune();
  const lista = await listaCurenta();

  const bifate = await db
    .select()
    .from(articoleLista)
    .where(and(eq(articoleLista.listaId, lista.id), eq(articoleLista.bifat, true)));

  const ziua = azi();

  for (const articol of bifate) {
    if (!articol.produsId || articol.pretEstimat == null) continue;
    await db
      .update(produse)
      .set({
        pretUltim: articol.pretEstimat,
        magazinUltimId: lista.magazinId,
        ultimaCumparareLa: ziua,
      })
      .where(eq(produse.id, articol.produsId));
  }

  await db
    .update(liste)
    .set({ finalizataLa: Math.floor(Date.now() / 1000), totalReal })
    .where(eq(liste.id, lista.id));

  let raspunsBuget: string | null = null;

  if (inBuget && areGoogle()) {
    const sume = await sumePentruBuget(lista.id, totalReal);
    if (sume.length > 0) {
      const [magazin] = lista.magazinId
        ? await db.select().from(magazine).where(eq(magazine.id, lista.magazinId)).limit(1)
        : [];

      const rezultat = await trimiteCheltuieli(
        sume.map((s) => ({
          data: ziua,
          categorie: s.categorie,
          suma: s.suma,
          descriere: magazin?.nume ?? "Cumpărături",
          sursa: "lista" as const,
          listaId: lista.id,
        })),
        sesiune.persoanaId,
      );

      raspunsBuget = rezultat.reusit
        ? `În buget au intrat ${sume.length === 1 ? "o categorie" : `${sume.length} categorii`}: ` +
          sume.map((s) => `${s.categorie} ${s.suma.toFixed(2)}`).join(", ") + " lei."
        : "Cumpărăturile s-au salvat, dar n-au ajuns în foaie. Le poți trimite din Bani.";

      if (rezultat.reusit) {
        await db
          .update(liste)
          .set({ trimisInBugetLa: Math.floor(Date.now() / 1000) })
          .where(eq(liste.id, lista.id));
      }
    }
  }

  revalidatePath("/lista");
  revalidatePath("/bani");
  revalidatePath("/");

  return raspunsBuget;
}

/** Folosită de câmpul de adăugare, care caută în timp ce scrii. */
export async function cauta(termen: string) {
  await ceruteSesiune();
  return cautaProduse(termen);
}
