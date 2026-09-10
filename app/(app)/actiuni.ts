"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { remindere } from "@/lib/db/schema";
import { amanaDeclutterul, marcheazaFacut } from "@/lib/servicii/planificator";
import { instiinteaza } from "@/lib/servicii/push";
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

/*
  Reminderele plecate imediat sunt trimise pe loc; restul așteaptă ceasul din
  `/api/cron`, care le ridică la scadență.
*/
function candSaPlece(cheie: string) {
  const d = new Date();
  switch (cheie) {
    case "o-ora":
      d.setHours(d.getHours() + 1);
      break;
    case "diseara":
      d.setHours(19, 0, 0, 0);
      // Dacă a trecut deja de 19, „diseară” înseamnă mâine seară.
      if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
      break;
    case "maine":
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      break;
    default:
      return { la: Math.floor(Date.now() / 1000), imediat: true };
  }
  return { la: Math.floor(d.getTime() / 1000), imediat: false };
}

export async function trimiteReminder(catre: number, text: string, cand: string) {
  const sesiune = await ceruteSesiune();
  const curat = text.trim();
  if (!curat) return "Scrie ceva mai întâi.";

  const { la, imediat } = candSaPlece(cand);

  const [reminder] = await db
    .insert(remindere)
    .values({ deLa: sesiune.persoanaId, catre, text: curat, cand: la })
    .returning({ id: remindere.id });

  if (!imediat) {
    const cateOre = Math.max(1, Math.round((la - Date.now() / 1000) / 3600));
    return `Gata. Îi ajunge peste ${cateOre === 1 ? "o oră" : `${cateOre} ore`}.`;
  }

  const { trimise } = await instiinteaza(catre, {
    titlu: `De la ${sesiune.nume}`,
    text: curat,
    eticheta: `reminder-${reminder.id}`,
  });

  await db
    .update(remindere)
    .set({ trimisLa: Math.floor(Date.now() / 1000) })
    .where(eq(remindere.id, reminder.id));

  return trimise > 0
    ? "Trimis. I-a apărut pe telefon."
    : "Salvat, dar n-are notificările pornite pe niciun telefon.";
}
