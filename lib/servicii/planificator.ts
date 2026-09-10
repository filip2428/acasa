import "server-only";

import { and, asc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { efectuari, persoane, sarcini, setari, zone } from "@/lib/db/schema";
import { azi, lunaCurenta } from "@/lib/formatare";

/*
  Ce e de făcut azi.

  Două lucruri diferite ajung aici:

  1. Treburile obișnuite, scadente. Scadența se socotește de la ultima efectuare,
     nu de la o zi fixă din calendar — dacă ai spălat baia sâmbătă, următoarea nu
     e mecanic sâmbăta viitoare.

  2. Declutterul lunii. O singură zonă pe lună, aleasă o dată și ținută minte,
     ca să nu se schimbe de sub tine la mijlocul lunii.

  Motorul care se uită și în calendarul Google și propune intervale libere vine
  la etapa următoare. Deocamdată răspundem doar la „ce a ajuns la scadență”.
*/

export type TreabaScadenta = {
  id: number;
  titlu: string;
  zona: string;
  minuteEstimate: number;
  efort: string;
  atribuitLui: number | null;
  /** Câte zile au trecut peste termen. 0 = fix azi. */
  intarziere: number;
  evitaLaMenstruatie: boolean;
};

/** Data la care ar trebui făcută următoarea dată o treabă. */
function scadenta(ultimaEfectuareLa: string | null, frecventaZile: number | null) {
  if (!frecventaZile) return null;
  if (!ultimaEfectuareLa) return azi(); // niciodată făcută: e scadentă acum
  const d = new Date(`${ultimaEfectuareLa}T12:00:00`);
  d.setDate(d.getDate() + frecventaZile);
  return azi(d);
}

function zileIntre(de_la: string, pana_la: string) {
  return Math.round(
    (new Date(`${pana_la}T12:00:00`).getTime() - new Date(`${de_la}T12:00:00`).getTime()) /
      86_400_000,
  );
}

/** Treburile ajunse la scadență, cele mai întârziate primele. */
export async function treburiScadente(ziua = azi()): Promise<TreabaScadenta[]> {
  const randuri = await db
    .select({
      id: sarcini.id,
      titlu: sarcini.titlu,
      zona: zone.nume,
      minuteEstimate: sarcini.minuteEstimate,
      efort: sarcini.efort,
      atribuitLui: sarcini.atribuitLui,
      frecventaZile: sarcini.frecventaZile,
      ultimaEfectuareLa: sarcini.ultimaEfectuareLa,
      evitaLaMenstruatie: sarcini.evitaLaMenstruatie,
    })
    .from(sarcini)
    .leftJoin(zone, eq(sarcini.zonaId, zone.id))
    .where(and(eq(sarcini.activ, true), eq(sarcini.tip, "curatenie")));

  return randuri
    .map((r) => {
      const cand = scadenta(r.ultimaEfectuareLa, r.frecventaZile);
      if (!cand) return null;
      const intarziere = zileIntre(cand, ziua);
      if (intarziere < 0) return null;
      return {
        id: r.id,
        titlu: r.titlu,
        zona: r.zona ?? "Casa",
        minuteEstimate: r.minuteEstimate,
        efort: r.efort,
        atribuitLui: r.atribuitLui,
        intarziere,
        evitaLaMenstruatie: r.evitaLaMenstruatie,
      };
    })
    .filter((t): t is TreabaScadenta => t !== null)
    .sort((a, b) => b.intarziere - a.intarziere || a.minuteEstimate - b.minuteEstimate);
}

/* ------------------------------------------------------- declutterul lunii */

export type DeclutterulLunii = {
  zonaId: number;
  zona: string;
  sarcinaId: number | null;
  facut: boolean;
};

const cheieDeclutter = (luna: string) => `declutter:${luna}`;

/**
 * Zona la rând pentru declutter luna asta.
 *
 * Alegerea se face o singură dată pe lună și se ține minte: dacă ar fi
 * recalculată la fiecare deschidere, zona s-ar putea schimba sub tine în
 * mijlocul lunii, exact când te apucaseși de ea.
 *
 * Se alege zona nedeschisă de cel mai mult timp; la egalitate, ordinea din
 * ecranul Casa.
 */
export async function declutterulLunii(luna = lunaCurenta()): Promise<DeclutterulLunii | null> {
  const [salvat] = await db
    .select()
    .from(setari)
    .where(eq(setari.cheie, cheieDeclutter(luna)))
    .limit(1);

  const toate = await db
    .select()
    .from(zone)
    .where(eq(zone.activ, true))
    .orderBy(asc(zone.ordineDeclutter), asc(zone.ordine));

  if (toate.length === 0) return null;

  let zonaId = (salvat?.valoare as { zonaId?: number } | undefined)?.zonaId;

  if (!zonaId || !toate.some((z) => z.id === zonaId)) {
    const aleasa = [...toate].sort((a, b) => {
      const dA = a.ultimulDeclutterLa ?? "";
      const dB = b.ultimulDeclutterLa ?? "";
      if (dA !== dB) return dA.localeCompare(dB);
      return (a.ordineDeclutter ?? 999) - (b.ordineDeclutter ?? 999);
    })[0];

    zonaId = aleasa.id;
    await db
      .insert(setari)
      .values({ cheie: cheieDeclutter(luna), valoare: { zonaId } })
      .onConflictDoUpdate({ target: setari.cheie, set: { valoare: { zonaId } } });
  }

  const zona = toate.find((z) => z.id === zonaId)!;

  const [sarcina] = await db
    .select({ id: sarcini.id })
    .from(sarcini)
    .where(and(eq(sarcini.zonaId, zona.id), eq(sarcini.tip, "declutter"), eq(sarcini.activ, true)))
    .limit(1);

  return {
    zonaId: zona.id,
    zona: zona.nume,
    sarcinaId: sarcina?.id ?? null,
    // Făcut dacă zona a fost golită chiar în luna asta.
    facut: (zona.ultimulDeclutterLa ?? "").startsWith(luna),
  };
}

/** Sare peste zona lunii și trece la următoarea din rotație. */
export async function amanaDeclutterul(luna = lunaCurenta()) {
  const curent = await declutterulLunii(luna);
  if (!curent) return;

  const toate = await db
    .select()
    .from(zone)
    .where(eq(zone.activ, true))
    .orderBy(asc(zone.ordineDeclutter), asc(zone.ordine));

  const pozitie = toate.findIndex((z) => z.id === curent.zonaId);
  const urmatoare = toate[(pozitie + 1) % toate.length];

  await db
    .insert(setari)
    .values({ cheie: cheieDeclutter(luna), valoare: { zonaId: urmatoare.id } })
    .onConflictDoUpdate({
      target: setari.cheie,
      set: { valoare: { zonaId: urmatoare.id } },
    });
}

/* ------------------------------------------------------------- marcarea */

/**
 * Marchează o treabă ca făcută: intră în istoric, iar scadența următoare se
 * calculează de aici înainte. Dacă treaba merge pe rând, trece la celălalt.
 */
export async function marcheazaFacut(sarcinaId: number, persoanaId: number, ziua = azi()) {
  const [sarcina] = await db.select().from(sarcini).where(eq(sarcini.id, sarcinaId)).limit(1);
  if (!sarcina) return;

  await db.insert(efectuari).values({ sarcinaId, persoanaId, data: ziua });

  let atribuitLui = sarcina.atribuitLui;
  if (sarcina.rotatie) {
    const toti = await db
      .select({ id: persoane.id })
      .from(persoane)
      .where(eq(persoane.activ, true))
      .orderBy(asc(persoane.id));
    const ids = toti.map((p) => p.id);
    const pozitie = ids.indexOf(persoanaId);
    // Următoarea persoană din listă preia treaba; cu o singură persoană, rămâne ea.
    atribuitLui = ids.length > 1 ? ids[(pozitie + 1) % ids.length] : persoanaId;
  }

  await db
    .update(sarcini)
    .set({
      ultimaEfectuareLa: ziua,
      urmatoareaLa: scadenta(ziua, sarcina.frecventaZile),
      atribuitLui,
    })
    .where(eq(sarcini.id, sarcinaId));

  // Declutterul ține și zona minte, ca rotația să meargă mai departe.
  if (sarcina.tip === "declutter" && sarcina.zonaId) {
    await db
      .update(zone)
      .set({ ultimulDeclutterLa: ziua })
      .where(eq(zone.id, sarcina.zonaId));
  }
}

/** Treburi care n-au fost făcute niciodată — folosit la primul contact cu aplicația. */
export async function treburiNeincepute() {
  const [rand] = await db
    .select({ cate: sql<number>`count(*)` })
    .from(sarcini)
    .where(
      and(
        eq(sarcini.activ, true),
        eq(sarcini.tip, "curatenie"),
        or(isNull(sarcini.ultimaEfectuareLa), eq(sarcini.ultimaEfectuareLa, "")),
      ),
    );
  return rand?.cate ?? 0;
}
