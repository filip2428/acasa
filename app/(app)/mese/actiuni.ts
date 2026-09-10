"use server";

import { revalidatePath } from "next/cache";

import type { DateReteta } from "@/lib/domeniu";
import { scoate as scoateDinCamara } from "@/lib/servicii/camara";
import {
  adaugaIngredient,
  comutaFavorit,
  gatitPeLoc,
  leagaIngredientul,
  marcheazaGatit,
  punePeLista,
  pusInPlan,
  salveazaReteta,
  scosDinPlan,
  stergeIngredient,
  stergeReteta,
} from "@/lib/servicii/retete";
import { ceruteSesiune } from "@/lib/sesiune";

/*
  Acțiunile bucătăriei.

  Aproape toate ating două ecrane deodată: rețeta și planul. De aia
  reîmprospătarea e strânsă într-un singur loc, în loc să fie uitată pe rând.
*/

function reimprospateaza(retetaId?: number) {
  revalidatePath("/mese");
  revalidatePath("/mese/retete");
  if (retetaId) revalidatePath(`/mese/retete/${retetaId}`);
  revalidatePath("/");
}

export async function salveaza(date: DateReteta) {
  await ceruteSesiune();
  if (!date.titlu.trim()) return null;

  const id = await salveazaReteta(date);
  reimprospateaza(id);
  return id;
}

export async function sterge(id: number) {
  await ceruteSesiune();
  await stergeReteta(id);
  reimprospateaza();
}

export async function comutaSteluta(id: number) {
  await ceruteSesiune();
  await comutaFavorit(id);
  reimprospateaza(id);
}

export async function adauga(
  retetaId: number,
  ingredient: { textOriginal: string; produsId?: number | null; cantitate?: number | null; unitate?: string | null },
) {
  await ceruteSesiune();
  await adaugaIngredient(retetaId, ingredient);
  reimprospateaza(retetaId);
}

export async function leaga(retetaId: number, ingredientId: number, produsId: number | null) {
  await ceruteSesiune();
  await leagaIngredientul(ingredientId, produsId);
  reimprospateaza(retetaId);
}

export async function scoateIngredientul(retetaId: number, id: number) {
  await ceruteSesiune();
  await stergeIngredient(id);
  reimprospateaza(retetaId);
}

/* ----------------------------------------------------------------- planul */

export async function pune(data: string, moment: string, retetaId: number) {
  await ceruteSesiune();
  await pusInPlan(data, moment, retetaId);
  reimprospateaza(retetaId);
}

export async function scoateDinPlan(id: number) {
  await ceruteSesiune();
  await scosDinPlan(id);
  reimprospateaza();
}

export async function bifeazaGatit(planId: number) {
  const sesiune = await ceruteSesiune();
  await marcheazaGatit(planId, sesiune.persoanaId);
  reimprospateaza();
}

/** „Am gătit-o acum”, fără să fi fost în plan. Se întâmplă mai des decât planul. */
export async function amGatit(retetaId: number) {
  const sesiune = await ceruteSesiune();
  await gatitPeLoc(retetaId, sesiune.persoanaId);
  reimprospateaza(retetaId);
}

/** „S-a terminat” — scoate un rând din cămară după ce s-a gătit din el. */
export async function sAterminat(retetaId: number, stocId: number) {
  await ceruteSesiune();
  await scoateDinCamara(stocId);
  reimprospateaza(retetaId);
  revalidatePath("/camara");
}

/* -------------------------------------------------------------- lipsurile */

export async function treciPeLista(produsIds: number[]) {
  const sesiune = await ceruteSesiune();
  const cate = await punePeLista(produsIds, sesiune.persoanaId);

  revalidatePath("/lista");
  reimprospateaza();

  if (cate === 0) return "Erau deja pe listă.";
  return cate === 1 ? "Am pus un lucru pe listă." : `Am pus ${cate} lucruri pe listă.`;
}
