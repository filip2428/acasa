import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { cicluri, persoane, stariZilnice } from "@/lib/db/schema";
import { azi, deplaseaza, zileIntre } from "@/lib/formatare";
import {
  CE_PRINDE_BINE,
  fazaInZiua,
  ORDINEA_FAZELOR,
  stareaCiclului,
  type Faza,
  type StareaCiclului,
} from "@/lib/servicii/socoteli-ciclu";

/*
  Ciclul, în aplicație.

  Cine își marchează ciclul e singura care îl poate marca; ce se vede — ziua,
  faza, estimările — e pentru amândoi, așa cum a hotărât Ralu. Singura excepție e
  starea zilnică: fiecare își răspunde singur la „cum te simți azi”, iar pe
  ecranul ciclului apar doar tiparele strânse din răspunsuri, nu zilele una câte
  una.
*/

/** Două marcări de început mai apropiate de atât sunt același ciclu, corectat. */
const ACELASI_CICLU = 15;

export async function cicluriPersoanei(persoanaId: number) {
  return db
    .select({
      id: cicluri.id,
      inceput: cicluri.inceput,
      sfarsit: cicluri.sfarsit,
    })
    .from(cicluri)
    .where(eq(cicluri.persoanaId, persoanaId))
    .orderBy(asc(cicluri.inceput));
}

/** Starea de azi a cuiva, sau null dacă n-a marcat niciodată nimic. */
export async function stareaPersoanei(persoanaId: number, ziua = azi()) {
  const ale = await cicluriPersoanei(persoanaId);
  if (ale.length === 0) return null;
  return stareaCiclului(ale, ziua);
}

export type CicluUrmarit = { persoanaId: number; nume: string; stare: StareaCiclului };

/** Cine din casă își urmărește ciclul, cu starea de azi. */
export async function cineIsiUrmaresteCiclul(ziua = azi()): Promise<CicluUrmarit[]> {
  const randuri = await db
    .select({
      persoanaId: cicluri.persoanaId,
      nume: persoane.nume,
      inceput: cicluri.inceput,
      sfarsit: cicluri.sfarsit,
    })
    .from(cicluri)
    .innerJoin(persoane, eq(cicluri.persoanaId, persoane.id))
    .where(eq(persoane.activ, true))
    .orderBy(asc(cicluri.persoanaId), asc(cicluri.inceput));

  const pePersoane = new Map<number, { nume: string; cicluri: typeof randuri }>();
  for (const rand of randuri) {
    const deja = pePersoane.get(rand.persoanaId);
    if (deja) deja.cicluri.push(rand);
    else pePersoane.set(rand.persoanaId, { nume: rand.nume, cicluri: [rand] });
  }

  return [...pePersoane.entries()].map(([persoanaId, p]) => ({
    persoanaId,
    nume: p.nume,
    stare: stareaCiclului(p.cicluri, ziua),
  }));
}

/**
 * Pe ce pune accent bucătăria azi, dacă e ceva de pus: fier în zilele de
 * menstruație, magneziu și carbohidrați complecși în săptămâna dinainte. În
 * celelalte faze nu există o recomandare cu dovezi, deci nu inventăm una.
 */
export async function accentulMeselor(ziua = azi()) {
  const urmariti = await cineIsiUrmaresteCiclul(ziua);
  for (const u of urmariti) {
    if (!u.stare.faza) continue;
    const etichete = CE_PRINDE_BINE[u.stare.faza].etichete;
    if (etichete.length > 0) {
      return { persoanaId: u.persoanaId, nume: u.nume, faza: u.stare.faza, etichete };
    }
  }
  return null;
}

/* ------------------------------------------------------------- marcarea */

/**
 * „A început.” Dacă există deja un început la mai puțin de două săptămâni,
 * e același ciclu marcat din nou — îl mutăm, nu facem unul nou. Așa un tap dat
 * de două ori, sau o zi corectată, nu strică media.
 */
export async function aInceput(persoanaId: number, zi: string, ziuaDeAzi = azi()) {
  if (zi > ziuaDeAzi) return "Nu se poate marca un început în viitor.";

  const ale = await cicluriPersoanei(persoanaId);
  const aproape = ale.find((c) => Math.abs(zileIntre(c.inceput, zi)) < ACELASI_CICLU);

  if (aproape) {
    if (aproape.inceput === zi) return null;
    await db
      .update(cicluri)
      .set({
        inceput: zi,
        // Un sfârșit care ar ajunge înaintea noului început nu mai are sens.
        sfarsit: aproape.sfarsit && aproape.sfarsit >= zi ? aproape.sfarsit : null,
      })
      .where(eq(cicluri.id, aproape.id));
    return null;
  }

  await db.insert(cicluri).values({ persoanaId, inceput: zi });
  return null;
}

/** „S-a terminat.” Se leagă de ultimul început de dinainte. */
export async function aTerminat(persoanaId: number, zi: string, ziuaDeAzi = azi()) {
  if (zi > ziuaDeAzi) return "Nu se poate marca un sfârșit în viitor.";

  const ale = await cicluriPersoanei(persoanaId);
  const curent = ale.filter((c) => c.inceput <= zi).at(-1);

  if (!curent) return "Marchează întâi când a început.";
  if (zileIntre(curent.inceput, zi) > 10) {
    return `Ultimul început marcat e pe ${curent.inceput}, prea departe. Marchează întâi începutul.`;
  }

  await db.update(cicluri).set({ sfarsit: zi }).where(eq(cicluri.id, curent.id));
  return null;
}

/** Scoate o marcare greșită. Doar cea care a marcat-o o poate scoate. */
export async function stergeCiclul(persoanaId: number, id: number) {
  await db.delete(cicluri).where(and(eq(cicluri.id, id), eq(cicluri.persoanaId, persoanaId)));
}

/* --------------------------------------------------------- starea zilei */

export async function stareaZilei(persoanaId: number, zi = azi()) {
  const [rand] = await db
    .select({ energie: stariZilnice.energie, simptome: stariZilnice.simptome })
    .from(stariZilnice)
    .where(and(eq(stariZilnice.persoanaId, persoanaId), eq(stariZilnice.data, zi)))
    .limit(1);

  return rand ? { energie: rand.energie, simptome: rand.simptome ?? [] } : null;
}

export async function salveazaStareaZilei(
  persoanaId: number,
  zi: string,
  stare: { energie: number | null; simptome: string[] },
) {
  const energie = stare.energie == null ? null : Math.min(5, Math.max(1, Math.round(stare.energie)));

  await db
    .insert(stariZilnice)
    .values({ persoanaId, data: zi, energie, simptome: stare.simptome })
    .onConflictDoUpdate({
      target: [stariZilnice.persoanaId, stariZilnice.data],
      set: { energie, simptome: stare.simptome },
    });
}

export type TiparFaza = {
  faza: Faza;
  zile: number;
  energieMedie: number | null;
  simptome: { nume: string; cate: number }[];
};

/**
 * Ce se repetă de la un ciclu la altul, din răspunsurile ei: cum e energia în
 * fiecare fază și ce simptome apar cel mai des. Doar pe ultimele șase luni, ca
 * să urmeze cum se schimbă lucrurile.
 */
export async function tiparele(persoanaId: number, ziuaDeAzi = azi()): Promise<TiparFaza[]> {
  const [ale, raspunsuri] = await Promise.all([
    cicluriPersoanei(persoanaId),
    db
      .select({ data: stariZilnice.data, energie: stariZilnice.energie, simptome: stariZilnice.simptome })
      .from(stariZilnice)
      .where(eq(stariZilnice.persoanaId, persoanaId)),
  ]);

  const deLa = deplaseaza(ziuaDeAzi, -183);
  type Grupa = { zile: number; energii: number[]; simptome: Map<string, number> };
  const peFaze = new Map<Faza, Grupa>();

  for (const r of raspunsuri) {
    if (r.data < deLa || r.data > ziuaDeAzi) continue;
    const faza = fazaInZiua(ale, r.data);
    if (!faza) continue;

    const grupa: Grupa = peFaze.get(faza) ?? { zile: 0, energii: [], simptome: new Map() };
    grupa.zile += 1;
    if (r.energie != null) grupa.energii.push(r.energie);
    for (const s of r.simptome ?? []) grupa.simptome.set(s, (grupa.simptome.get(s) ?? 0) + 1);
    peFaze.set(faza, grupa);
  }

  return ORDINEA_FAZELOR.filter((f) => peFaze.has(f)).map((faza) => {
    const g = peFaze.get(faza)!;
    return {
      faza,
      zile: g.zile,
      energieMedie:
        g.energii.length > 0
          ? Math.round((g.energii.reduce((t, e) => t + e, 0) / g.energii.length) * 10) / 10
          : null,
      simptome: [...g.simptome.entries()]
        .map(([nume, cate]) => ({ nume, cate }))
        .sort((a, b) => b.cate - a.cate)
        .slice(0, 3),
    };
  });
}
