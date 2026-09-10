"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { dorinte } from "@/lib/db/schema";
import { ceruteSesiune } from "@/lib/sesiune";

export type DateDorinta = {
  id?: number;
  titlu: string;
  pret: number | null;
  url: string | null;
  prioritate: number;
  notite: string | null;
};

export async function salveazaDorinta(date: DateDorinta) {
  const sesiune = await ceruteSesiune();
  const titlu = date.titlu.trim();
  if (!titlu) return;

  const valori = {
    titlu,
    pret: date.pret,
    url: date.url?.trim() || null,
    prioritate: date.prioritate,
    notite: date.notite?.trim() || null,
    creatDe: sesiune.persoanaId,
  };

  if (date.id) {
    await db.update(dorinte).set(valori).where(eq(dorinte.id, date.id));
  } else {
    await db.insert(dorinte).values(valori);
  }

  revalidatePath("/casa/dorinte");
  revalidatePath("/casa");
}

export async function comutaCumparat(id: number, cumparat: boolean) {
  await ceruteSesiune();
  await db
    .update(dorinte)
    .set({ stare: cumparat ? "cumparat" : "idee" })
    .where(eq(dorinte.id, id));
  revalidatePath("/casa/dorinte");
  revalidatePath("/casa");
}

export async function stergeDorinta(id: number) {
  await ceruteSesiune();
  await db.delete(dorinte).where(eq(dorinte.id, id));
  revalidatePath("/casa/dorinte");
  revalidatePath("/casa");
}
