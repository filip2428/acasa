"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { sarcini, zone } from "@/lib/db/schema";
import { ceruteSesiune } from "@/lib/sesiune";

/*
  Adăugarea și modificarea zonelor și a treburilor.

  Nimic nu se șterge de-a binelea: zonele și sarcinile se marchează `activ: false`,
  ca istoricul efectuărilor să rămână întreg.
*/

export async function adaugaZona(nume: string) {
  await ceruteSesiune();
  const curat = nume.trim();
  if (!curat) return;

  const [ultima] = await db
    .select({
      ordine: sql<number>`coalesce(max(${zone.ordine}), 0)`,
      declutter: sql<number>`coalesce(max(${zone.ordineDeclutter}), 0)`,
    })
    .from(zone);

  await db.insert(zone).values({
    nume: curat,
    ordine: (ultima?.ordine ?? 0) + 10,
    // Zona nouă intră la coada rotației de declutter.
    ordineDeclutter: (ultima?.declutter ?? 0) + 1,
  });

  revalidatePath("/casa");
}

export async function redenumesteZona(id: number, nume: string) {
  await ceruteSesiune();
  const curat = nume.trim();
  if (!curat) return;
  await db.update(zone).set({ nume: curat }).where(eq(zone.id, id));
  revalidatePath("/casa");
}

export async function scoateZona(id: number) {
  await ceruteSesiune();
  await db.update(zone).set({ activ: false }).where(eq(zone.id, id));
  await db.update(sarcini).set({ activ: false }).where(eq(sarcini.zonaId, id));
  revalidatePath("/casa");
}

export type DateSarcina = {
  id?: number;
  zonaId: number;
  titlu: string;
  tip: string;
  frecventaZile: number | null;
  minuteEstimate: number;
  efort: string;
  atribuitLui: number | null;
  rotatie: boolean;
  evitaLaMenstruatie: boolean;
};

export async function salveazaSarcina(date: DateSarcina) {
  await ceruteSesiune();
  const titlu = date.titlu.trim();
  if (!titlu) return;

  const valori = {
    zonaId: date.zonaId,
    titlu,
    tip: date.tip,
    frecventaZile: date.frecventaZile,
    minuteEstimate: date.minuteEstimate || 15,
    efort: date.efort,
    // O sarcină cu rotație nu are proprietar fix; se alternează la fiecare efectuare.
    atribuitLui: date.rotatie ? null : date.atribuitLui,
    rotatie: date.rotatie,
    evitaLaMenstruatie: date.evitaLaMenstruatie,
  };

  if (date.id) {
    await db.update(sarcini).set(valori).where(eq(sarcini.id, date.id));
  } else {
    await db.insert(sarcini).values(valori);
  }

  revalidatePath("/casa");
}

export async function scoateSarcina(id: number) {
  await ceruteSesiune();
  await db.update(sarcini).set({ activ: false }).where(eq(sarcini.id, id));
  revalidatePath("/casa");
}
