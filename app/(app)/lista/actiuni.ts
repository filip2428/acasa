"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { articoleLista, liste, produse } from "@/lib/db/schema";
import { azi } from "@/lib/formatare";
import { cautaProduse, listaCurenta } from "@/lib/servicii/lista";
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
 * Închide lista curentă. Prețurile bifate intră în istoric, iar produsele
 * își actualizează ultimul preț și data ultimei cumpărături.
 */
export async function finalizeazaLista(totalReal: number | null) {
  await ceruteSesiune();
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

  revalidatePath("/lista");
  revalidatePath("/");
}

/** Folosită de câmpul de adăugare, care caută în timp ce scrii. */
export async function cauta(termen: string) {
  await ceruteSesiune();
  return cautaProduse(termen);
}
