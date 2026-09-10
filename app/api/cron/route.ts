import { and, eq, isNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { persoane, remindere, setari } from "@/lib/db/schema";
import { inRomania } from "@/lib/formatare";
import { evenimenteDeAnuntat } from "@/lib/servicii/calendar-casa";
import { ceExpira } from "@/lib/servicii/camara";
import { declutterulLunii, treburiScadente } from "@/lib/servicii/planificator";
import { propunereaZilei } from "@/lib/servicii/propuneri";
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

/** „a trecut de termen”, „azi”, „mâine”, „în 5 zile”. */
function cand(zilePanaLa: number | null) {
  if (zilePanaLa == null) return "";
  if (zilePanaLa < 0) return "a trecut de termen";
  if (zilePanaLa === 0) return "azi";
  if (zilePanaLa === 1) return "mâine";
  return `în ${zilePanaLa} zile`;
}

/** Rezumatul zilei: ce a ajuns la scadență și ce zonă e la rând la declutter. */
async function trimiteRezumatul() {
  const { ziua, ora } = inRomania();
  if (ora !== ORA_REZUMAT) return { trimis: false, motiv: `nu e ora ${ORA_REZUMAT}` };

  const cheie = `rezumat:${ziua}`;
  const [deja] = await db.select().from(setari).where(eq(setari.cheie, cheie)).limit(1);
  if (deja) return { trimis: false, motiv: "deja trimis azi" };

  // Marcăm întâi, ca o a doua chemare în aceeași oră să nu trimită din nou.
  await db.insert(setari).values({ cheie, valoare: { la: Date.now() } });

  const [treburi, declutter, expira, evenimente] = await Promise.all([
    treburiScadente(ziua),
    declutterulLunii(),
    ceExpira(2, ziua),
    evenimenteDeAnuntat(ziua),
  ]);

  const bucati: string[] = [];

  // Ce expiră trece înaintea treburilor: mâncarea aruncată nu se mai recuperează.
  if (expira.length > 0) {
    bucati.push(
      expira.length === 1
        ? `expiră ${expira[0].nume.toLowerCase()}`
        : `expiră ${expira.length} lucruri, primul e ${expira[0].nume.toLowerCase()}`,
    );
  }

  for (const eveniment of evenimente.slice(0, 2)) {
    bucati.push(`${eveniment.titlu} ${cand(eveniment.zilePanaLa)}`);
  }

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
  const texte: string[] = [];

  for (const persoana of toti) {
    // Partea comună e aceeași pentru amândoi; propunerea e a fiecăruia, pentru
    // că numai el are după-masa aia liberă.
    const propunere = await propunereaZilei(persoana.id);
    const text = [
      ...bucati,
      propunere && propunere.stare === "propus" && !propunere.esteMaine
        ? `ai liber de la ${propunere.ora}: ${propunere.treaba.titlu.toLowerCase()}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const { trimise: cate } = await instiinteaza(persoana.id, {
      titlu: "Azi",
      text,
      cale: "/",
      eticheta: "rezumat",
    });

    trimise += cate;
    texte.push(text);
  }

  // Întoarcem și textele: la un cron care rulează la 8 dimineața, răspunsul e
  // singurul loc din care se vede ce-a plecat, dacă cineva se plânge.
  return { trimis: true, dispozitive: trimise, texte };
}

/** Ca să putem verifica ușor din browser că ruta trăiește. */
export async function POST(cerere: Request) {
  return GET(cerere);
}
