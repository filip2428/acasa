"use server";

import { revalidatePath } from "next/cache";

import {
  marcheazaEveniment,
  salveazaEveniment,
  scoateEveniment,
} from "@/lib/servicii/calendar-casa";
import type { DateEveniment } from "@/lib/domeniu";
import { ceruteSesiune } from "@/lib/sesiune";

export async function salveaza(date: DateEveniment) {
  const sesiune = await ceruteSesiune();
  if (!date.titlu.trim()) return;
  await salveazaEveniment(date, sesiune.persoanaId);
  revalidatePath("/casa/calendar");
  revalidatePath("/casa");
  revalidatePath("/");
}

export async function bifeaza(id: number) {
  await ceruteSesiune();
  await marcheazaEveniment(id);
  revalidatePath("/casa/calendar");
  revalidatePath("/casa");
  revalidatePath("/");
}

export async function scoate(id: number) {
  await ceruteSesiune();
  await scoateEveniment(id);
  revalidatePath("/casa/calendar");
  revalidatePath("/casa");
}
