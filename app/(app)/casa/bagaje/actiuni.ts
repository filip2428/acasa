"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import {
  articoleBagaj,
  articoleSablonBagaj,
  bagaje,
  sabloaneBagaj,
} from "@/lib/db/schema";
import { ceruteSesiune } from "@/lib/sesiune";

/*
  Șabloane de bagaje și listele pornite din ele.

  Un șablon e lista de care ai nevoie de fiecare dată („la mare”, „la părinți”,
  „city break”). Când pleci, pornești o listă din el: se copiază articolele, iar
  bifele de acum nu strică șablonul pentru data viitoare.
*/

export async function adaugaSablon(nume: string) {
  await ceruteSesiune();
  const curat = nume.trim();
  if (!curat) return;
  await db.insert(sabloaneBagaj).values({ nume: curat });
  revalidatePath("/casa/bagaje");
}

export async function stergeSablon(id: number) {
  await ceruteSesiune();

  // Listele deja pornite din șablonul ăsta rămân — sunt bagaje pe care cineva
  // le împachetează chiar acum. Le rupem doar legătura, altfel baza de date
  // refuză ștergerea și butonul pare că nu face nimic.
  await db.update(bagaje).set({ sablonId: null }).where(eq(bagaje.sablonId, id));

  await db.delete(sabloaneBagaj).where(eq(sabloaneBagaj.id, id));
  revalidatePath("/casa/bagaje");
}

export async function adaugaArticolSablon(sablonId: number, text: string) {
  await ceruteSesiune();
  const curat = text.trim();
  if (!curat) return;

  const existente = await db
    .select({ ordine: articoleSablonBagaj.ordine })
    .from(articoleSablonBagaj)
    .where(eq(articoleSablonBagaj.sablonId, sablonId));

  const ultima = existente.reduce((m, a) => Math.max(m, a.ordine), 0);

  await db.insert(articoleSablonBagaj).values({ sablonId, text: curat, ordine: ultima + 10 });
  revalidatePath("/casa/bagaje");
}

export async function stergeArticolSablon(id: number) {
  await ceruteSesiune();
  await db.delete(articoleSablonBagaj).where(eq(articoleSablonBagaj.id, id));
  revalidatePath("/casa/bagaje");
}

/** Pornește o listă de bagaje dintr-un șablon, copiindu-i articolele. */
export async function porneste(sablonId: number, nume: string) {
  await ceruteSesiune();

  const [bagaj] = await db
    .insert(bagaje)
    .values({ sablonId, nume: nume.trim() || "Plecare" })
    .returning({ id: bagaje.id });

  const articole = await db
    .select()
    .from(articoleSablonBagaj)
    .where(eq(articoleSablonBagaj.sablonId, sablonId))
    .orderBy(asc(articoleSablonBagaj.ordine));

  if (articole.length > 0) {
    await db.insert(articoleBagaj).values(
      articole.map((a) => ({
        bagajId: bagaj.id,
        text: a.text,
        categorie: a.categorie,
      })),
    );
  }

  revalidatePath("/casa/bagaje");
  return bagaj.id;
}

export async function comutaArticol(id: number, bifat: boolean) {
  await ceruteSesiune();
  await db.update(articoleBagaj).set({ bifat }).where(eq(articoleBagaj.id, id));
  revalidatePath("/casa/bagaje");
}

export async function adaugaArticolBagaj(bagajId: number, text: string) {
  await ceruteSesiune();
  const curat = text.trim();
  if (!curat) return;
  await db.insert(articoleBagaj).values({ bagajId, text: curat });
  revalidatePath("/casa/bagaje");
}

export async function inchideBagajul(id: number) {
  await ceruteSesiune();
  await db.delete(bagaje).where(eq(bagaje.id, id));
  revalidatePath("/casa/bagaje");
}
