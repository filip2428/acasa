import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { evenimente } from "@/lib/db/schema";
import type { DateEveniment, EvenimentAfisat } from "@/lib/domeniu";
import { adaugaLuni, azi, zileIntre } from "@/lib/formatare";
import {
  actualizeaza,
  deCeNuSePoateScrie,
  pune,
  scoate as scoateDinGoogle,
} from "@/lib/servicii/calendar-google";

/*
  Calendarul casei: ITP, RCA, revizii, controale, documente care expiră.

  Ce îl deosebește de un calendar obișnuit e că recurența pleacă de la **ultima
  efectuare**, nu de la o dată fixă. ITP-ul e la doi ani de la ultimul ITP, nu pe
  15 martie la nesfârșit. Bifezi „făcut azi” și următorul se recalculează singur.

  Categoriile sunt cele cerute: mașină, casă, sănătate, documente, altele.
*/

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
        googleCalendarId: e.googleCalendarId,
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

  let id = date.id;
  let vechi: typeof evenimente.$inferSelect | undefined;

  if (id) {
    [vechi] = await db.select().from(evenimente).where(eq(evenimente.id, id)).limit(1);
    await db.update(evenimente).set(valori).where(eq(evenimente.id, id));
  } else {
    const [nou] = await db.insert(evenimente).values(valori).returning({ id: evenimente.id });
    id = nou.id;
  }

  const avertisment = await sincronizeazaCuGoogle(id, {
    titlu: valori.titlu,
    ziua: scadentaEvenimentului(valori.data, valori.recurentaLuni, vechi?.ultimaEfectuareLa ?? null),
    notite: valori.notite,
    calendarNou: date.googleCalendarId,
    calendarVechi: vechi?.googleCalendarId ?? null,
    evenimentVechi: vechi?.googleEvenimentId ?? null,
  });

  return { id, avertisment };
}

/*
  Oglindirea în Google.

  Regula pe care o respectă tot ce urmează: baza de date a casei e adevărul, iar
  Google e o copie de conveniență. Dacă scrierea în Google pică — calendar
  partajat doar la citire, internet căzut — evenimentul rămâne salvat la noi și
  ecranul spune ce s-a întâmplat. Nu pierdem nimic din ce a scris omul pentru că
  n-a mers un serviciu din afară.
*/
async function sincronizeazaCuGoogle(
  id: number,
  d: {
    titlu: string;
    ziua: string | null;
    notite: string | null;
    calendarNou: string | null;
    calendarVechi: string | null;
    evenimentVechi: string | null;
  },
) {
  const acelasi = d.calendarNou && d.calendarNou === d.calendarVechi && d.evenimentVechi;

  try {
    // A fost scos din Google, sau mutat în alt calendar: ștergem copia veche.
    if (d.calendarVechi && d.evenimentVechi && !acelasi) {
      await scoateDinGoogle(d.calendarVechi, d.evenimentVechi);
      await db
        .update(evenimente)
        .set({ googleCalendarId: null, googleEvenimentId: null })
        .where(eq(evenimente.id, id));
    }

    if (!d.calendarNou || !d.ziua) return null;

    if (acelasi) {
      await actualizeaza(d.calendarNou, d.evenimentVechi!, { titlu: d.titlu, ziua: d.ziua });
      return null;
    }

    const googleId = await pune(d.calendarNou, {
      titlu: d.titlu,
      ziua: d.ziua,
      notite: d.notite,
    });

    await db
      .update(evenimente)
      .set({ googleCalendarId: d.calendarNou, googleEvenimentId: googleId })
      .where(eq(evenimente.id, id));

    return null;
  } catch (eroare) {
    return `Salvat la noi, dar n-a ajuns în Google. ${deCeNuSePoateScrie(eroare)}`;
  }
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

  const urmatoarea = adaugaLuni(ziua, eveniment.recurentaLuni);

  await db
    .update(evenimente)
    .set({ ultimaEfectuareLa: ziua, data: urmatoarea })
    .where(eq(evenimente.id, id));

  // Dacă e trecut și în Google, se mută și acolo — altfel ar rămâne acolo o dată
  // care nu mai e adevărată.
  if (eveniment.googleCalendarId && eveniment.googleEvenimentId) {
    try {
      await actualizeaza(eveniment.googleCalendarId, eveniment.googleEvenimentId, {
        ziua: urmatoarea,
      });
    } catch {
      // Copia din Google rămâne în urmă; adevărul e la noi și se vede în aplicație.
    }
  }
}

export async function scoateEveniment(id: number) {
  const [eveniment] = await db.select().from(evenimente).where(eq(evenimente.id, id)).limit(1);

  await db
    .update(evenimente)
    .set({ activ: false, googleCalendarId: null, googleEvenimentId: null })
    .where(eq(evenimente.id, id));

  if (eveniment?.googleCalendarId && eveniment.googleEvenimentId) {
    try {
      await scoateDinGoogle(eveniment.googleCalendarId, eveniment.googleEvenimentId);
    } catch {
      // Dacă n-am putut șterge din Google, măcar la noi a dispărut.
    }
  }
}
