"use server";

import { revalidatePath } from "next/cache";

import { expirarePropusa, pune, schimbaCantitatea, scoate } from "@/lib/servicii/camara";
import { ceruteSesiune } from "@/lib/sesiune";

export async function propuneExpirarea(produsId: number) {
  await ceruteSesiune();
  return expirarePropusa(produsId);
}

export async function puneInCamara(intrare: {
  produsId: number;
  cantitate: number;
  unitate: string;
  loc: string;
  expiraLa: string | null;
}) {
  const sesiune = await ceruteSesiune();
  await pune({ ...intrare, persoanaId: sesiune.persoanaId });
  revalidatePath("/camara");
  revalidatePath("/");
}

export async function scoateDinCamara(id: number) {
  await ceruteSesiune();
  await scoate(id);
  revalidatePath("/camara");
  revalidatePath("/");
}

export async function schimbaCat(id: number, cantitate: number, unitate?: string) {
  await ceruteSesiune();
  await schimbaCantitatea(id, cantitate, unitate);
  revalidatePath("/camara");
  revalidatePath("/");
}
