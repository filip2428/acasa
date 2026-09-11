"use server";

import { revalidatePath } from "next/cache";

import { azi } from "@/lib/formatare";
import { SIMPTOME } from "@/lib/servicii/socoteli-ciclu";
import {
  aInceput,
  aTerminat,
  salveazaStareaZilei,
  stergeCiclul,
} from "@/lib/servicii/ciclu";
import { ceruteSesiune } from "@/lib/sesiune";

/*
  Marcările ciclului. Fiecare își marchează doar propriul ciclu: persoana vine
  din sesiune, niciodată din ce trimite ecranul.
*/

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function reimprospateaza() {
  revalidatePath("/ciclu");
  revalidatePath("/");
  revalidatePath("/mese");
}

export async function marcheazaInceputul(zi: string) {
  const sesiune = await ceruteSesiune();
  if (!DATA.test(zi)) return "Data nu e bună.";
  const problema = await aInceput(sesiune.persoanaId, zi);
  reimprospateaza();
  return problema;
}

export async function marcheazaSfarsitul(zi: string) {
  const sesiune = await ceruteSesiune();
  if (!DATA.test(zi)) return "Data nu e bună.";
  const problema = await aTerminat(sesiune.persoanaId, zi);
  reimprospateaza();
  return problema;
}

export async function scoateMarcarea(id: number) {
  const sesiune = await ceruteSesiune();
  await stergeCiclul(sesiune.persoanaId, id);
  reimprospateaza();
}

/** „Cum te simți azi.” Ziua o pune serverul, ca să fie ziua României. */
export async function spuneCumTeSimti(stare: { energie: number | null; simptome: string[] }) {
  const sesiune = await ceruteSesiune();
  const cunoscute = new Set<string>(SIMPTOME);

  await salveazaStareaZilei(sesiune.persoanaId, azi(), {
    energie: stare.energie,
    simptome: stare.simptome.filter((s) => cunoscute.has(s)),
  });

  // Doar ecranul ciclului arată tiparele; „Azi” își ține singur bifele.
  revalidatePath("/ciclu");
}
