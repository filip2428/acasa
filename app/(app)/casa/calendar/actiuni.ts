"use server";

import { revalidatePath } from "next/cache";

import {
  marcheazaEveniment,
  salveazaEveniment,
  scoateEveniment,
} from "@/lib/servicii/calendar-casa";
import type { DateEveniment } from "@/lib/domeniu";
import { ceruteSesiune } from "@/lib/sesiune";

function reimprospateaza() {
  revalidatePath("/casa/calendar");
  revalidatePath("/casa");
  revalidatePath("/");
}

export async function salveaza(date: DateEveniment) {
  const sesiune = await ceruteSesiune();
  if (!date.titlu.trim()) return null;

  const { avertisment } = await salveazaEveniment(date, sesiune.persoanaId);
  reimprospateaza();

  // Ecranul are nevoie să știe dacă a plecat și spre Google sau doar la noi.
  return { avertisment };
}

export async function bifeaza(id: number) {
  await ceruteSesiune();
  await marcheazaEveniment(id);
  reimprospateaza();
}

export async function scoate(id: number) {
  await ceruteSesiune();
  await scoateEveniment(id);
  reimprospateaza();
}
