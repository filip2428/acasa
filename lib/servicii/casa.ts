import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { persoane, sarcini, zone } from "@/lib/db/schema";

/*
  Zonele casei și treburile lor.

  O „zonă” e o încăpere sau un dulap; o „sarcină” e o treabă care se repetă în ea.
  Recurența pleacă de la ultima efectuare, nu de la o dată fixă: dacă ai spălat
  baia sâmbătă, următoarea nu e mecanic sâmbăta viitoare.

  Zonele intră și în rotația lunară de declutter, câte una pe lună, în ordinea
  dată de `ordineDeclutter`.
*/

export type SarcinaAfisata = {
  id: number;
  titlu: string;
  tip: string;
  frecventaZile: number | null;
  minuteEstimate: number;
  efort: string;
  atribuitLui: number | null;
  rotatie: boolean;
  evitaLaMenstruatie: boolean;
  ultimaEfectuareLa: string | null;
};

export type ZonaAfisata = {
  id: number;
  nume: string;
  ordine: number;
  ordineDeclutter: number | null;
  ultimulDeclutterLa: string | null;
  sarcini: SarcinaAfisata[];
};

export async function zoneleCasei(): Promise<ZonaAfisata[]> {
  const [randuriZone, randuriSarcini] = await Promise.all([
    db.select().from(zone).where(eq(zone.activ, true)).orderBy(asc(zone.ordine)),
    db.select().from(sarcini).where(eq(sarcini.activ, true)).orderBy(asc(sarcini.id)),
  ]);

  return randuriZone.map((z) => ({
    id: z.id,
    nume: z.nume,
    ordine: z.ordine,
    ordineDeclutter: z.ordineDeclutter,
    ultimulDeclutterLa: z.ultimulDeclutterLa,
    sarcini: randuriSarcini
      .filter((s) => s.zonaId === z.id)
      .map((s) => ({
        id: s.id,
        titlu: s.titlu,
        tip: s.tip,
        frecventaZile: s.frecventaZile,
        minuteEstimate: s.minuteEstimate,
        efort: s.efort,
        atribuitLui: s.atribuitLui,
        rotatie: s.rotatie,
        evitaLaMenstruatie: s.evitaLaMenstruatie,
        ultimaEfectuareLa: s.ultimaEfectuareLa,
      }))
      // Treburile obișnuite întâi, declutterul la coadă — el vine o dată pe an.
      .sort((a, b) =>
        a.tip === b.tip
          ? (a.frecventaZile ?? 9999) - (b.frecventaZile ?? 9999)
          : a.tip === "declutter"
            ? 1
            : -1,
      ),
  }));
}

export async function persoaneleCasei() {
  return db
    .select({ id: persoane.id, nume: persoane.nume })
    .from(persoane)
    .where(eq(persoane.activ, true))
    .orderBy(asc(persoane.id));
}

/** Câte minute de treburi are casa într-o săptămână obișnuită. */
export function minutePeSaptamana(zone: ZonaAfisata[]) {
  let total = 0;
  for (const zona of zone) {
    for (const sarcina of zona.sarcini) {
      if (!sarcina.frecventaZile) continue;
      total += (sarcina.minuteEstimate / sarcina.frecventaZile) * 7;
    }
  }
  return Math.round(total);
}
