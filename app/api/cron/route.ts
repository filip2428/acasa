import { and, eq, isNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { persoane, remindere, setari } from "@/lib/db/schema";
import { declutterulLunii, treburiScadente } from "@/lib/servicii/planificator";
import { instiinteaza } from "@/lib/servicii/push";

/*
  Ceasul aplicației.

  Vercel pe plan gratuit rulează cron o dată pe zi, ceea ce nu ajunge pentru
  „amintește-mi la 18:30”. De asta ruta asta e gândită să fie chemată des — la
  5 minute, dintr-un serviciu gratuit ca cron-job.org — și decide singură ce e
  de făcut la ora la care a fost chemată.

  La fiecare chemare face două lucruri:
  1. trimite reminderele ajunse la scadență;
  2. o singură dată pe zi, la ora stabilită, trimite rezumatul zilei.

  Ora se socotește în timpul României, nu al serverului: pe Vercel serverul e pe
  UTC și rezumatul ar pleca cu trei ore mai devreme vara.
*/

export const dynamic = "force-dynamic";

// Ora la care pleacă rezumatul, în timpul României. Se schimbă din .env.local
// dacă 8 dimineața e prea devreme sau prea târziu.
const ORA_REZUMAT = Number(process.env.ORA_REZUMAT ?? 8);

function acumInRomania() {
  const formatat = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const bucata = (tip: string) => formatat.find((p) => p.type === tip)?.value ?? "";
  return {
    ziua: `${bucata("year")}-${bucata("month")}-${bucata("day")}`,
    ora: Number(bucata("hour")),
  };
}

export async function GET(cerere: Request) {
  const cheieAsteptata = process.env.CHEIE_CRON;
  const cheiePrimita =
    new URL(cerere.url).searchParams.get("cheie") ??
    cerere.headers.get("authorization")?.replace("Bearer ", "");

  if (!cheieAsteptata || cheiePrimita !== cheieAsteptata) {
    return NextResponse.json({ eroare: "Cheie greșită." }, { status: 401 });
  }

  const raport = {
    remindere: await trimiteRemindere(),
    rezumat: await trimiteRezumatul(),
  };

  return NextResponse.json(raport);
}

/** Reminderele pe care și le-au pus unul altuia și au ajuns la scadență. */
async function trimiteRemindere() {
  const acum = Math.floor(Date.now() / 1000);

  const scadente = await db
    .select({
      id: remindere.id,
      text: remindere.text,
      catre: remindere.catre,
      numeExpeditor: persoane.nume,
    })
    .from(remindere)
    .leftJoin(persoane, eq(remindere.deLa, persoane.id))
    .where(and(isNull(remindere.trimisLa), lte(remindere.cand, acum)));

  for (const reminder of scadente) {
    await instiinteaza(reminder.catre, {
      titlu: reminder.numeExpeditor ? `De la ${reminder.numeExpeditor}` : "Reminder",
      text: reminder.text,
      eticheta: `reminder-${reminder.id}`,
    });
    await db.update(remindere).set({ trimisLa: acum }).where(eq(remindere.id, reminder.id));
  }

  return scadente.length;
}

/** Rezumatul zilei: ce a ajuns la scadență și ce zonă e la rând la declutter. */
async function trimiteRezumatul() {
  const { ziua, ora } = acumInRomania();
  if (ora !== ORA_REZUMAT) return { trimis: false, motiv: `nu e ora ${ORA_REZUMAT}` };

  const cheie = `rezumat:${ziua}`;
  const [deja] = await db.select().from(setari).where(eq(setari.cheie, cheie)).limit(1);
  if (deja) return { trimis: false, motiv: "deja trimis azi" };

  // Marcăm întâi, ca o a doua chemare în aceeași oră să nu trimită din nou.
  await db.insert(setari).values({ cheie, valoare: { la: Date.now() } });

  const [treburi, declutter] = await Promise.all([treburiScadente(ziua), declutterulLunii()]);

  const bucati: string[] = [];
  if (treburi.length > 0) {
    bucati.push(
      treburi.length === 1
        ? `1 treabă: ${treburi[0].titlu.toLowerCase()}`
        : `${treburi.length} treburi, prima e ${treburi[0].titlu.toLowerCase()}`,
    );
  }
  if (declutter && !declutter.facut && new Date(`${ziua}T12:00:00`).getDate() <= 3) {
    bucati.push(`declutter luna asta: ${declutter.zona.toLowerCase()}`);
  }

  if (bucati.length === 0) return { trimis: false, motiv: "n-are ce spune" };

  const toti = await db
    .select({ id: persoane.id })
    .from(persoane)
    .where(eq(persoane.activ, true));

  let trimise = 0;
  for (const persoana of toti) {
    const { trimise: cate } = await instiinteaza(persoana.id, {
      titlu: "Azi",
      text: bucati.join(" · "),
      cale: "/",
      eticheta: "rezumat",
    });
    trimise += cate;
  }

  return { trimis: true, dispozitive: trimise, text: bucati.join(" · ") };
}

/** Ca să putem verifica ușor din browser că ruta trăiește. */
export async function POST(cerere: Request) {
  return GET(cerere);
}
