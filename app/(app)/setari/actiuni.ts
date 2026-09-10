"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { persoane } from "@/lib/db/schema";
import { incearcaCalendarul } from "@/lib/servicii/calendar-google";
import { ceruteSesiune } from "@/lib/sesiune";

/*
  Legarea calendarului Google.

  Fiecare își leagă calendarul lui, de pe telefonul lui. Nu salvăm o adresă până
  n-am citit efectiv din ea: altfel ai pleca de aici convins că merge, iar
  aplicația ar tăcea la nesfârșit pentru că partajarea n-a fost făcută.
*/

export async function leagaCalendarul(calendarId: string) {
  const sesiune = await ceruteSesiune();
  const curat = calendarId.trim();

  if (!curat) return { merge: false as const, motiv: "Scrie adresa calendarului." };

  const proba = await incearcaCalendarul(curat);
  if (!proba.merge) return proba;

  await db
    .update(persoane)
    .set({ calendarGoogleId: curat })
    .where(eq(persoane.id, sesiune.persoanaId));

  revalidatePath("/setari");
  revalidatePath("/casa/calendar");
  revalidatePath("/");

  return proba;
}

export async function dezleagaCalendarul() {
  const sesiune = await ceruteSesiune();

  await db
    .update(persoane)
    .set({ calendarGoogleId: null })
    .where(eq(persoane.id, sesiune.persoanaId));

  revalidatePath("/setari");
  revalidatePath("/casa/calendar");
  revalidatePath("/");
}
