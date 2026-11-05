import "server-only";

import { lunaCurenta } from "@/lib/formatare";
import { explicaEroarea } from "@/lib/servicii/buget";
import { stareaEconomiilor, type StareEconomii } from "@/lib/servicii/economii";
import { areGoogle } from "@/lib/servicii/google";

/*
  Starea economiilor pentru un ecran, sau motivul pentru care n-a putut fi citită.
  Ecranele de bani nu se blochează: arată ce e de reparat, în cuvinte.
*/

export async function incarcaEconomii(): Promise<{ stare: StareEconomii; eroare?: never } | { stare?: never; eroare: string }> {
  if (!areGoogle() || !process.env.BUGET_SHEET_ID) {
    return { eroare: "Aplicația nu e legată de foaia de buget (lipsesc datele contului de serviciu Google)." };
  }
  try {
    return { stare: await stareaEconomiilor() };
  } catch (eroare) {
    console.error("Nu am putut citi economiile din Google Sheets:", eroare);
    return { eroare: explicaEroarea(eroare, lunaCurenta()) };
  }
}
