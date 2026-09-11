import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { categorii, produse, stoc } from "@/lib/db/schema";
import type { RandStoc } from "@/lib/domeniu";
import { azi } from "@/lib/formatare";

/*
  Cămara: ce avem în casă, unde, și până când.

  Problema reală a oricărei aplicații de cămară e că nimeni nu introduce manual
  date de expirare. De asta catalogul ține `zileValabilitate` per produs, iar
  când un produs intră în casă data de expirare vine **propusă** — o confirmi cu
  un tap sau o corectezi. Din bon nu se poate citi expirarea, dar din categorie
  se poate estima foarte decent.

  Congelatorul nu e o zonă a casei, e un loc de depozitare: aceleași rânduri,
  alt `loc`.
*/

function zileIntre(de_la: string, pana_la: string) {
  return Math.round(
    (new Date(`${pana_la}T12:00:00`).getTime() - new Date(`${de_la}T12:00:00`).getTime()) /
      86_400_000,
  );
}

export async function camara(ziua = azi()): Promise<RandStoc[]> {
  const randuri = await db
    .select({
      id: stoc.id,
      produsId: stoc.produsId,
      nume: produse.nume,
      categorie: categorii.nume,
      cantitate: stoc.cantitate,
      unitate: stoc.unitate,
      loc: stoc.loc,
      expiraLa: stoc.expiraLa,
      adaugatLa: stoc.adaugatLa,
      pozaUrl: produse.pozaUrl,
    })
    .from(stoc)
    .innerJoin(produse, eq(stoc.produsId, produse.id))
    .leftJoin(categorii, eq(produse.categorieId, categorii.id))
    .where(isNull(stoc.consumatLa))
    .orderBy(asc(stoc.expiraLa));

  return randuri
    .map((r) => ({
      ...r,
      zilePanaLaExpirare: r.expiraLa ? zileIntre(ziua, r.expiraLa) : null,
    }))
    // Ce expiră curând, sus. Ce n-are dată, la coadă.
    .sort((a, b) => {
      if (a.zilePanaLaExpirare == null) return 1;
      if (b.zilePanaLaExpirare == null) return -1;
      return a.zilePanaLaExpirare - b.zilePanaLaExpirare;
    });
}

/** Ce expiră în următoarele N zile, plus ce a expirat deja. */
export async function ceExpira(inZile = 2, ziua = azi()) {
  const toate = await camara(ziua);
  return toate.filter((r) => r.zilePanaLaExpirare != null && r.zilePanaLaExpirare <= inZile);
}

/** Data de expirare propusă pentru un produs, din cât ține el de obicei. */
export async function expirarePropusa(produsId: number, deLa = azi()) {
  const [produs] = await db
    .select({ zile: produse.zileValabilitate })
    .from(produse)
    .where(eq(produse.id, produsId))
    .limit(1);

  if (!produs?.zile) return null;

  const d = new Date(`${deLa}T12:00:00`);
  d.setDate(d.getDate() + produs.zile);
  return azi(d);
}

export async function pune(intrare: {
  produsId: number;
  cantitate: number;
  unitate?: string;
  loc: string;
  expiraLa: string | null;
  persoanaId: number;
}) {
  const [produs] = await db
    .select({ unitate: produse.unitate })
    .from(produse)
    .where(eq(produse.id, intrare.produsId))
    .limit(1);

  await db.insert(stoc).values({
    produsId: intrare.produsId,
    cantitate: intrare.cantitate,
    unitate: intrare.unitate ?? produs?.unitate ?? "buc",
    loc: intrare.loc,
    expiraLa: intrare.expiraLa,
    adaugatLa: azi(),
    adaugatDe: intrare.persoanaId,
  });
}

/** Scoate din cămară: consumat, aruncat, terminat. */
export async function scoate(id: number) {
  await db
    .update(stoc)
    .set({ consumatLa: Math.floor(Date.now() / 1000) })
    .where(eq(stoc.id, id));
}

export async function schimbaCantitatea(id: number, cantitate: number, unitate?: string) {
  if (cantitate <= 0) return scoate(id);
  await db
    .update(stoc)
    .set(unitate ? { cantitate, unitate } : { cantitate })
    .where(eq(stoc.id, id));
}

/** Câte lucruri sunt în fiecare loc — pentru cifrele de pe ecranul cămării. */
export async function numaraPeLocuri() {
  const toate = await camara();
  const rezultat = new Map<string, number>();
  for (const rand of toate) {
    rezultat.set(rand.loc, (rezultat.get(rand.loc) ?? 0) + 1);
  }
  return rezultat;
}

/** Produsele din catalog care nu sunt acum în cămară — pentru adăugare rapidă. */
export async function produseDeAdaugat() {
  const inCamara = await db
    .select({ produsId: stoc.produsId })
    .from(stoc)
    .where(isNull(stoc.consumatLa));
  const deja = new Set(inCamara.map((r) => r.produsId));

  const toate = await db
    .select({
      id: produse.id,
      nume: produse.nume,
      unitate: produse.unitate,
      cantitateImplicita: produse.cantitateImplicita,
      zileValabilitate: produse.zileValabilitate,
    })
    .from(produse)
    .where(and(eq(produse.arhivat, false)));

  return toate
    .map((p) => ({ ...p, esteInCamara: deja.has(p.id) }))
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
}
