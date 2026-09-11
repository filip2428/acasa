import "server-only";

import { isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { evenimente as tabelEvenimente } from "@/lib/db/schema";
import type { IntrareZi, ZiDinCalendar } from "@/lib/domeniu";
import { azi, deplaseaza } from "@/lib/formatare";
import { calendarulCasei } from "@/lib/servicii/calendar-casa";
import { agendaCasei } from "@/lib/servicii/calendar-google";
import { treburiInInterval } from "@/lib/servicii/planificator";
import { marginileGrilei } from "@/lib/servicii/socoteli-calendar";

/*
  Grila unei luni.

  Aduce la un loc trei feluri de lucruri care până acum stăteau separat:
  scadențele casei (ITP, revizii), treburile cu ritmul lor, și ce are fiecare în
  calendarul lui Google. Într-o lună le vezi pe toate suprapuse — și abia așa se
  vede unde mai încape ceva.
*/

export async function lunaDinCalendar(luna: string, ziuaDeAzi = azi()) {
  const { prima, ultima, deLa, panaLa } = marginileGrilei(luna);

  const [evenimente, treburi, agende, oglindite] = await Promise.all([
    calendarulCasei(ziuaDeAzi),
    treburiInInterval(deLa, panaLa, ziuaDeAzi),
    agendaCasei(deLa, panaLa),
    copiileNoastreDinGoogle(),
  ]);

  const peZile = new Map<string, IntrareZi[]>();
  const adauga = (zi: string, intrare: IntrareZi) => {
    const lista = peZile.get(zi);
    if (lista) lista.push(intrare);
    else peZile.set(zi, [intrare]);
  };

  for (const e of evenimente) {
    if (!e.scadenta || e.scadenta < deLa || e.scadenta > panaLa) continue;
    adauga(e.scadenta, {
      fel: "eveniment",
      id: e.id,
      titlu: e.titlu,
      categorie: e.categorie,
      intarziat: e.scadenta < ziuaDeAzi,
    });
  }

  for (const t of treburi) {
    adauga(t.ziua, {
      fel: "treaba",
      id: t.id,
      titlu: t.titlu,
      zona: t.zona,
      minute: t.minute,
      intarziat: t.intarziat,
    });
  }

  for (const agenda of agende) {
    for (const e of agenda.evenimente) {
      // Ce am trecut noi în Google se vede deja ca eveniment al casei, cu tot cu
      // butonul de „făcut azi”. Copia din Google n-ar adăuga nimic, doar ar
      // dubla rândul.
      if (oglindite.has(e.idGoogle)) continue;

      adauga(e.ziua, {
        fel: "google",
        id: `${agenda.persoanaId}:${e.id}`,
        titlu: e.titlu,
        persoanaId: agenda.persoanaId,
        persoana: agenda.nume,
        ora: e.ora,
        oraSfarsit: e.oraSfarsit,
      });
    }
  }

  const zile: ZiDinCalendar[] = [];
  for (let zi = deLa; zi <= panaLa; zi = deplaseaza(zi, 1)) {
    zile.push({
      ziua: zi,
      numar: Number(zi.slice(8)),
      esteAzi: zi === ziuaDeAzi,
      altaLuna: zi < prima || zi > ultima,
      intrari: (peZile.get(zi) ?? []).sort(compara),
    });
  }

  return { luna, zile, agende };
}

/*
  Ordinea dintr-o zi: întâi ce e în calendarele voastre (ce ține toată ziua sus,
  ca în Google, apoi orele), pe urmă scadențele casei, la urmă treburile — ele
  sunt singurele care se mută ușor.
*/
const RANG: Record<IntrareZi["fel"], number> = { google: 0, eveniment: 1, treaba: 2 };

/** Id-urile evenimentelor pe care aplicația însăși le-a scris în Google. */
async function copiileNoastreDinGoogle() {
  const randuri = await db
    .select({ googleEvenimentId: tabelEvenimente.googleEvenimentId })
    .from(tabelEvenimente)
    .where(isNotNull(tabelEvenimente.googleEvenimentId));

  return new Set(randuri.map((r) => r.googleEvenimentId!));
}

function compara(a: IntrareZi, b: IntrareZi) {
  if (a.fel === "google" && b.fel === "google") {
    return (a.ora ?? "00:00").localeCompare(b.ora ?? "00:00");
  }
  return RANG[a.fel] - RANG[b.fel];
}
