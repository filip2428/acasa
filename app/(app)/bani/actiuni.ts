"use server";

import { revalidatePath } from "next/cache";

import {
  reincearcaTrimiterea,
  trimiteCheltuieli,
  verificaFoaia,
  type RezultatTrimitere,
  type StareaFoii,
} from "@/lib/servicii/buget";
import { citesteSuma } from "@/lib/formatare";
import { ceruteSesiune } from "@/lib/sesiune";

export type StareCheltuiala = {
  mesaj?: string;
  avertisment?: string;
  eroare?: string;
};

/**
 * Adaugă o cheltuială în foaia lunii, pe orice categorie din buget — nu doar pe
 * cele legate de cumpărături.
 */
export async function adaugaCheltuiala(
  _anterioara: StareCheltuiala,
  date: FormData,
): Promise<StareCheltuiala> {
  const sesiune = await ceruteSesiune();

  const categorie = String(date.get("categorie") ?? "").trim();
  const suma = citesteSuma(String(date.get("suma") ?? "")) ?? NaN;
  const data = String(date.get("data") ?? "").trim();
  const descriere = String(date.get("descriere") ?? "").trim();

  if (!categorie) return { eroare: "Alege o categorie." };
  if (!Number.isFinite(suma) || suma <= 0) return { eroare: "Suma trebuie să fie mai mare ca zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { eroare: "Data nu e bună." };

  const rezultat = await trimiteCheltuieli(
    [{ data, categorie, suma, descriere: descriere || null, sursa: "manual" }],
    sesiune.persoanaId,
  );

  revalidatePath("/bani");
  revalidatePath("/bani/istoric");
  revalidatePath("/");
  revalidatePath("/lista");

  return raspuns(rezultat, `${suma.toFixed(2)} lei pe „${categorie}” au intrat în buget.`);
}

function raspuns(rezultat: RezultatTrimitere, laReusita: string): StareCheltuiala {
  if (!rezultat.reusit) {
    return {
      eroare:
        "N-am putut scrie în foaie, dar cheltuiala e salvată în aplicație și o reîncerc. " +
        `Motivul: ${rezultat.eroare}`,
    };
  }
  return {
    mesaj: rezultat.foaieCreata ? `${laReusita} Am creat și foaia lunii.` : laReusita,
    avertisment: rezultat.avertisment ?? undefined,
  };
}

export async function reincearca() {
  await ceruteSesiune();
  const rezultat = await reincearcaTrimiterea();
  revalidatePath("/bani");
  revalidatePath("/bani/istoric");
  return rezultat;
}

/** Recitește foaia acum, fără să aștepte să se învechească copia. */
export async function reimprospateazaBugetul(): Promise<StareaFoii> {
  await ceruteSesiune();
  const stare = await verificaFoaia();
  revalidatePath("/bani");
  revalidatePath("/bani/istoric");
  revalidatePath("/lista");
  revalidatePath("/");
  return stare;
}
