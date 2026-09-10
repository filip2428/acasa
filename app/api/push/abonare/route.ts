import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { abonamentePush } from "@/lib/db/schema";
import { sesiuneCurenta } from "@/lib/sesiune";

/*
  Înregistrarea și scoaterea unui telefon din lista celor care primesc notificări.

  E rută de API, nu acțiune de server, pentru că browserul ne dă abonamentul ca
  obiect `PushSubscription` din care ne trebuie doar câteva câmpuri.
*/

const abonament = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(cerere: Request) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return NextResponse.json({ eroare: "Nu ești autentificat." }, { status: 401 });

  const verificat = abonament.safeParse(await cerere.json());
  if (!verificat.success) {
    return NextResponse.json({ eroare: "Abonament nevalid." }, { status: 400 });
  }

  const { endpoint, keys } = verificat.data;

  // Același telefon se poate reabona după ce a fost șters sau după reinstalare.
  await db
    .insert(abonamentePush)
    .values({
      persoanaId: sesiune.persoanaId,
      endpoint,
      cheieP256dh: keys.p256dh,
      cheieAuth: keys.auth,
    })
    .onConflictDoUpdate({
      target: abonamentePush.endpoint,
      set: {
        persoanaId: sesiune.persoanaId,
        cheieP256dh: keys.p256dh,
        cheieAuth: keys.auth,
        esecuriLaRand: 0,
      },
    });

  return NextResponse.json({ bine: true });
}

export async function DELETE(cerere: Request) {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) return NextResponse.json({ eroare: "Nu ești autentificat." }, { status: 401 });

  const { endpoint } = (await cerere.json()) as { endpoint?: string };
  if (endpoint) {
    await db.delete(abonamentePush).where(eq(abonamentePush.endpoint, endpoint));
  }

  return NextResponse.json({ bine: true });
}
