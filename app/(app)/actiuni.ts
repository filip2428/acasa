"use server";

import { revalidatePath } from "next/cache";

import { amanaDeclutterul, marcheazaFacut } from "@/lib/servicii/planificator";
import { ceruteSesiune } from "@/lib/sesiune";

export async function bifeazaTreaba(sarcinaId: number) {
  const sesiune = await ceruteSesiune();
  await marcheazaFacut(sarcinaId, sesiune.persoanaId);
  revalidatePath("/");
  revalidatePath("/casa");
}

export async function amanaZonaDeDeclutter() {
  await ceruteSesiune();
  await amanaDeclutterul();
  revalidatePath("/");
}
