"use server";

import { redirect } from "next/navigation";

import { autentifica } from "@/lib/sesiune";

export type StareIntrare = { eroare?: string };

export async function intra(
  _stareAnterioara: StareIntrare,
  date: FormData,
): Promise<StareIntrare> {
  // Câmp-capcană: e ascuns vizual, deci un om nu-l completează niciodată.
  // Boții care completează orice formular îl completează.
  if (date.get("telefon")) return { eroare: "Codul nu e bun." };

  const eroare = await autentifica(String(date.get("cod") ?? ""));
  if (eroare) return { eroare };

  redirect("/");
}
