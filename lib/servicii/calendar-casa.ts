import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { evenimente } from "@/lib/db/schema";
import type { DateEveniment, EvenimentAfisat } from "@/lib/domeniu";
import { azi } from "@/lib/formatare";

/*
  Calendarul casei: ITP, RCA, revizii, controale, documente care expiră.

  Ce îl deosebește de un calendar obișnuit e că recurența pleacă de la **ultima
  efectuare**, nu de la o dată fixă. ITP-ul e la doi ani de la ultimul ITP, nu pe
  15 martie la nesfârșit. Bifezi „făcut azi” și următorul se recalculează singur.

  Categoriile sunt cele cerute: mașină, casă, sănătate, documente, altele.
*/

/** Adaugă luni la o dată, fără să sară peste sfârșitul lunii (31 ian + 1 lună = 28/29 feb). */
export function adaugaLuni(data: string, luni: number) {
  const d = new Date(`${data}T12:00:00`);
  const ziua = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + luni);
  const zileInLuna = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(ziua, zileInLuna));
  return azi(d);
}

function zileIntre(de_la: string, pana_la: string) {
  return Math.round(
    (new Date(`${pana_la}T12:00:00`).getTime() - new Date(`${de_la}T12:00:00`).getTime()) /
      86_400_000,
  );
}

/** Când e de făcut următoarea dată. */
export function scadentaEvenimentului(
  data: string | null,
  recurentaLuni: number | null,
  ultimaEfectuareLa: string | null,
) {
  if (recurentaLuni && ultimaEfectuareLa) return adaugaLuni(ultimaEfectuareLa, recurentaLuni);
  return data;
}

export async function calendarulCasei(ziua = azi()): Promise<EvenimentAfisat[]> {
  const randuri = await db
    .select()
    .from(evenimente)
    .where(eq(evenimente.activ, true))
    .orderBy(asc(evenimente.data));

  return randuri
    .map((e) => {
      const scadenta = scadentaEvenimentului(e.data, e.recurentaLuni, e.ultimaEfectuareLa);
      return {
        id: e.id,
        titlu: e.titlu,
        categorie: e.categorie,
        scadenta,
        recurentaLuni: e.recurentaLuni,
        ultimaEfectuareLa: e.ultimaEfectuareLa,
        remindereZileInainte: e.remindereZileInainte,
        notite: e.notite,
        zilePanaLa: scadenta ? zileIntre(ziua, scadenta) : null,
      };
    })
    // Cele mai apropiate primele; cele fără dată, la coadă.
    .sort((a, b) => {
      if (a.zilePanaLa == null) return 1;
      if (b.zilePanaLa == null) return -1;
      return a.zilePanaLa - b.zilePanaLa;
    });
}

/** Ce e de anunțat azi: a intrat în fereastra de reminder sau a trecut de scadență. */
export async function evenimenteDeAnuntat(ziua = azi()) {
  const toate = await calendarulCasei(ziua);
  return toate.filter(
    (e) => e.zilePanaLa != null && e.zilePanaLa <= e.remindereZileInainte,
  );
}

export async function salveazaEveniment(date: DateEveniment, persoanaId: number) {
  const valori = {
    titlu: date.titlu.trim(),
    categorie: date.categorie,
    data: date.data,
    recurentaLuni: date.recurentaLuni,
    remindereZileInainte: date.remindereZileInainte,
    notite: date.notite?.trim() || null,
    creatDe: persoanaId,
  };

  if (date.id) {
    await db.update(evenimente).set(valori).where(eq(evenimente.id, date.id));
    return date.id;
  }

  const [nou] = await db.insert(evenimente).values(valori).returning({ id: evenimente.id });
  return nou.id;
}

/**
 * „Am făcut-o azi”. Pentru ce se repetă, mută scadența cu recurența înainte;
 * pentru ce se întâmplă o singură dată, îl scoate din calendar.
 */
export async function marcheazaEveniment(id: number, ziua = azi()) {
  const [eveniment] = await db.select().from(evenimente).where(eq(evenimente.id, id)).limit(1);
  if (!eveniment) return;

  if (!eveniment.recurentaLuni) {
    await db.update(evenimente).set({ activ: false }).where(eq(evenimente.id, id));
    return;
  }

  await db
    .update(evenimente)
    .set({ ultimaEfectuareLa: ziua, data: adaugaLuni(ziua, eveniment.recurentaLuni) })
    .where(eq(evenimente.id, id));
}

export async function scoateEveniment(id: number) {
  await db.update(evenimente).set({ activ: false }).where(eq(evenimente.id, id));
}
