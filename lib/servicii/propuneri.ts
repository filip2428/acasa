import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { persoane, propuneri, sarcini, zone } from "@/lib/db/schema";
import type { EvenimentGoogle, PropunereaZilei, TreabaScadenta } from "@/lib/domeniu";
import { azi, deplaseaza, inRomania } from "@/lib/formatare";
import {
  deCeNuSePoateScrie,
  evenimenteGoogle,
  puneLaOra,
} from "@/lib/servicii/calendar-google";
import { stareaPersoanei } from "@/lib/servicii/ciclu";
import { areGoogle } from "@/lib/servicii/google";
import { treburiScadente } from "@/lib/servicii/planificator";
import { candIncape, ceas, sfertulUrmator } from "@/lib/servicii/socoteli-calendar";

/*
  „Vezi când am o după-masă liberă și atunci zi-mi să fac ceva.”

  Ăsta e motivul pentru care aplicația citește calendarele. Nu ca să le arate —
  ci ca să nu propună nimic într-o zi plină, și să propună exact în ziua în care
  se poate.

  Trei reguli, ca propunerea să fie de ajutor și nu încă o notificare:

  1. O singură propunere pe zi, de om. Dacă a zis „nu azi”, gata pentru azi.
  2. Numai când chiar e loc: fereastra trebuie să încapă întreagă, nu „mai prinzi
     tu 20 de minute între două ședințe”.
  3. Numai lucruri deja scadente. Nu inventăm treabă ca să umplem timpul liber.
*/

/** Ora la care începem să ne uităm la ziua de mâine în loc de cea de azi. */
const PREA_TARZIU = 18;

/** Ce a răspuns deja azi, dacă a răspuns. */
async function raspunsulDeAzi(persoanaId: number, ziua: string) {
  const [rand] = await db
    .select()
    .from(propuneri)
    .where(
      and(
        eq(propuneri.persoanaId, persoanaId),
        eq(propuneri.data, ziua),
        inArray(propuneri.stare, ["acceptat", "refuzat", "facut"]),
      ),
    )
    .limit(1);

  return rand;
}

/** Treaba acceptată, reconstruită pentru card. */
async function treabaAcceptata(sarcinaId: number): Promise<TreabaScadenta | null> {
  const [rand] = await db
    .select({
      id: sarcini.id,
      titlu: sarcini.titlu,
      zona: zone.nume,
      minuteEstimate: sarcini.minuteEstimate,
      efort: sarcini.efort,
      atribuitLui: sarcini.atribuitLui,
      evitaLaMenstruatie: sarcini.evitaLaMenstruatie,
    })
    .from(sarcini)
    .leftJoin(zone, eq(sarcini.zonaId, zone.id))
    .where(eq(sarcini.id, sarcinaId))
    .limit(1);

  if (!rand) return null;
  return { ...rand, zona: rand.zona ?? "Casa", intarziere: 0 };
}

export async function propunereaZilei(
  persoanaId: number,
  acum = new Date(),
): Promise<PropunereaZilei | null> {
  if (!areGoogle()) return null;

  const [persoana] = await db
    .select({ calendarId: persoane.calendarGoogleId })
    .from(persoane)
    .where(eq(persoane.id, persoanaId))
    .limit(1);

  if (!persoana?.calendarId) return null;

  const { ziua, ora, minutDinZi } = inRomania(acum);

  const raspuns = await raspunsulDeAzi(persoanaId, ziua);
  if (raspuns) {
    // Ce a acceptat rămâne pe ecran până seara; ce a refuzat dispare.
    if (raspuns.stare !== "acceptat" || !raspuns.sarcinaId) return null;
    const treaba = await treabaAcceptata(raspuns.sarcinaId);
    if (!treaba) return null;
    return {
      ziua,
      esteMaine: false,
      ora: raspuns.oraStart ?? "",
      treaba,
      stare: "acceptat",
    };
  }

  // După-masă târziu nu mai are rost să propunem ziua de azi.
  const esteMaine = ora >= PREA_TARZIU;
  const tinta = esteMaine ? deplaseaza(ziua, 1) : ziua;

  const treburi = await treburiScadente(ziua);
  const ciclul = await stareaPersoanei(persoanaId, tinta);

  // Treburile marcate „nu o propune în zilele cu menstruație” rămân pe listă, dar
  // nu le propunem noi atunci — exact cum promite bifa din fișa treburii.
  const alePersoanei = treburi.filter(
    (t) =>
      (!t.atribuitLui || t.atribuitLui === persoanaId) &&
      !(ciclul?.faza === "menstruala" && t.evitaLaMenstruatie),
  );
  if (alePersoanei.length === 0) return null;

  let program: EvenimentGoogle[];
  try {
    program = await evenimenteGoogle(persoana.calendarId, tinta, tinta);
  } catch {
    // Fără programul lui n-avem cum ști dacă e liber; mai bine tăcem.
    return null;
  }

  // Pentru azi pornim de la ceas, nu de la 15:00 — altfel am propune o oră
  // care a trecut deja.
  const nuInainteDe = esteMaine ? 0 : sfertulUrmator(minutDinZi);

  // Cea mai întârziată treabă care încape. Dacă nu încape, încercăm una mai scurtă.
  for (const treaba of alePersoanei) {
    const minut = candIncape(program, treaba.minuteEstimate, nuInainteDe);
    if (minut == null) continue;
    return { ziua: tinta, esteMaine, ora: ceas(minut), treaba, stare: "propus" };
  }

  return null;
}

/* --------------------------------------------------------------- răspunsuri */

/** „Nu azi.” Se ține minte, ca să nu revină aceeași propunere peste o oră. */
export async function refuza(persoanaId: number, sarcinaId: number, ziua = azi()) {
  await db.insert(propuneri).values({
    data: ziua,
    persoanaId,
    sarcinaId,
    stare: "refuzat",
    raspunsLa: Math.floor(Date.now() / 1000),
  });
}

/**
 * „Bine, o pun în calendar.” Scrie în Google la ora propusă; dacă n-avem drept
 * de scriere, propunerea rămâne acceptată la noi și spunem de ce n-a ajuns acolo.
 */
export async function accepta(
  persoanaId: number,
  propunere: { sarcinaId: number; titlu: string; ziua: string; ora: string; minute: number },
) {
  const [persoana] = await db
    .select({ calendarId: persoane.calendarGoogleId })
    .from(persoane)
    .where(eq(persoane.id, persoanaId))
    .limit(1);

  let evenimentGoogleId: string | null = null;
  let avertisment: string | null = null;

  if (persoana?.calendarId) {
    try {
      evenimentGoogleId = await puneLaOra(persoana.calendarId, {
        titlu: propunere.titlu,
        ziua: propunere.ziua,
        ora: propunere.ora,
        minute: propunere.minute,
      });
    } catch (eroare) {
      avertisment = deCeNuSePoateScrie(eroare);
    }
  }

  await db.insert(propuneri).values({
    data: azi(),
    persoanaId,
    sarcinaId: propunere.sarcinaId,
    oraStart: propunere.ora,
    minute: propunere.minute,
    stare: "acceptat",
    raspunsLa: Math.floor(Date.now() / 1000),
    evenimentGoogleId,
  });

  return { avertisment };
}
