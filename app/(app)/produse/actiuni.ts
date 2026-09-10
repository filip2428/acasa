"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { preturi, produse } from "@/lib/db/schema";
import { azi } from "@/lib/formatare";
import {
  actualizeazaRitmul,
  cautaInOpenFoodFacts,
  produsDupaCodBare,
} from "@/lib/servicii/produse";
import { ceruteSesiune } from "@/lib/sesiune";

export type RezultatScanare =
  | { fel: "existent"; produsId: number; nume: string }
  | { fel: "gasit"; codBare: string; nume: string; pozaUrl: string | null; cantitate: string | null }
  | { fel: "necunoscut"; codBare: string };

/**
 * Ce facem cu un cod de bare scanat: îl avem deja, îl găsim în Open Food Facts,
 * sau nu știm nimic despre el și îl completăm de mână.
 */
export async function scaneazaCod(codBare: string): Promise<RezultatScanare> {
  await ceruteSesiune();
  const curat = codBare.replace(/\D/g, "");

  const existent = await produsDupaCodBare(curat);
  if (existent) return { fel: "existent", produsId: existent.id, nume: existent.nume };

  const gasit = await cautaInOpenFoodFacts(curat);
  if (gasit) {
    return {
      fel: "gasit",
      codBare: curat,
      nume: gasit.marca ? `${gasit.nume} (${gasit.marca})` : gasit.nume,
      pozaUrl: gasit.pozaUrl,
      cantitate: gasit.cantitate,
    };
  }

  return { fel: "necunoscut", codBare: curat };
}

export async function salveazaProdus(intrare: {
  id?: number;
  nume: string;
  categorieId: number | null;
  unitate: string;
  cantitateImplicita: number;
  codBare: string | null;
  pozaUrl: string | null;
  pret: number | null;
  zileValabilitate: number | null;
}) {
  await ceruteSesiune();

  const valori = {
    nume: intrare.nume.trim(),
    categorieId: intrare.categorieId,
    unitate: intrare.unitate,
    cantitateImplicita: intrare.cantitateImplicita || 1,
    codBare: intrare.codBare?.trim() || null,
    pozaUrl: intrare.pozaUrl,
    zileValabilitate: intrare.zileValabilitate,
    ...(intrare.pret != null ? { pretUltim: intrare.pret } : {}),
  };

  let produsId = intrare.id;

  if (produsId) {
    await db.update(produse).set(valori).where(eq(produse.id, produsId));
  } else {
    const [nou] = await db.insert(produse).values(valori).returning({ id: produse.id });
    produsId = nou.id;
  }

  // Fiecare preț introdus intră în istoric, ca să vedem cum se mișcă în timp.
  if (intrare.pret != null && produsId) {
    await db.insert(preturi).values({
      produsId,
      pret: intrare.pret,
      cantitate: intrare.cantitateImplicita || 1,
      unitate: intrare.unitate,
      data: azi(),
      sursa: "manual",
    });
    await actualizeazaRitmul(produsId);
  }

  revalidatePath("/produse");
  revalidatePath("/lista");
  return produsId;
}

export async function arhiveazaProdus(id: number) {
  await ceruteSesiune();
  // Nu ștergem: istoricul de prețuri și listele vechi trimit la produsul ăsta.
  await db.update(produse).set({ arhivat: true }).where(eq(produse.id, id));
  revalidatePath("/produse");
}
