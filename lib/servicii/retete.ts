import "server-only";

import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  articoleLista,
  categorii,
  ingredienteReteta,
  planMese,
  produse,
  retete,
  stoc,
} from "@/lib/db/schema";
import type {
  DateReteta,
  IngredientAfisat,
  MasaDinPlan,
  RetetaAfisata,
  StareIngredient,
} from "@/lib/domeniu";
import { azi } from "@/lib/formatare";
import { camara } from "@/lib/servicii/camara";
import { listaCurenta } from "@/lib/servicii/lista";
import { EXPIRA_CURAND } from "@/lib/servicii/socoteli-meniu";

/*
  Caietul de rețete.

  E un singur caiet, cu mai multe origini: scrise de mână, aduse dintr-un link
  sau, când vor fi credențialele, sincronizate din Cookidoo. Motivul pentru care
  n-avem două sisteme paralele e simplu: numai rețeta din aplicație poate ști ce
  e în cămară, ce expiră și cât costă ce-ți lipsește. Cookidoo n-are de unde.

  Ingredientele au două fețe: textul așa cum e scris în rețetă („2 cepe mari”) și,
  opțional, legătura cu un produs din catalog. Legătura e cea care face rețeta
  deșteaptă — din ea ies „ai / nu ai”, lista de cumpărături și prețul lipsurilor.
  Fără ea, ingredientul rămâne „neștiut”, ceea ce e adevărat și nu strică nimic.
*/

/* ------------------------------------------------------------ citirea lor */

type StareaCasei = {
  /** Produsele aflate acum în cămară, cu câte zile mai au. */
  inCamara: Map<number, number | null>;
  /** Produsele pe care le avem mereu — sarea, uleiul. */
  mereu: Set<number>;
  /** Când a fost gătită ultima dată fiecare rețetă. */
  ultimaGatire: Map<number, string>;
};

async function stareaCasei(ziua: string): Promise<StareaCasei> {
  const [randuri, stabile, gatite] = await Promise.all([
    camara(ziua),
    db.select({ id: produse.id }).from(produse).where(eq(produse.mereuInCasa, true)),
    db
      .select({ retetaId: planMese.retetaId, data: planMese.data })
      .from(planMese)
      .where(and(isNotNull(planMese.retetaId), isNotNull(planMese.gatitLa)))
      .orderBy(desc(planMese.data)),
  ]);

  const inCamara = new Map<number, number | null>();
  for (const rand of randuri) {
    // Dacă avem același produs în două locuri, ne interesează cel mai grăbit.
    const deja = inCamara.get(rand.produsId);
    if (deja === undefined || (rand.zilePanaLaExpirare != null && (deja == null || rand.zilePanaLaExpirare < deja))) {
      inCamara.set(rand.produsId, rand.zilePanaLaExpirare);
    }
  }

  const ultimaGatire = new Map<number, string>();
  for (const rand of gatite) {
    if (rand.retetaId != null && !ultimaGatire.has(rand.retetaId)) {
      ultimaGatire.set(rand.retetaId, rand.data);
    }
  }

  return { inCamara, mereu: new Set(stabile.map((p) => p.id)), ultimaGatire };
}

function stareaIngredientului(
  produsId: number | null,
  casa: StareaCasei,
): { stare: StareIngredient; zile: number | null } {
  if (produsId == null) return { stare: "nestiut", zile: null };
  if (casa.mereu.has(produsId)) return { stare: "mereu", zile: null };
  if (casa.inCamara.has(produsId)) {
    return { stare: "ai", zile: casa.inCamara.get(produsId) ?? null };
  }
  return { stare: "lipsa", zile: null };
}

function compune(
  reteta: typeof retete.$inferSelect,
  ingrediente: (typeof ingredienteReteta.$inferSelect & { nume: string | null })[],
  casa: StareaCasei,
): RetetaAfisata {
  const afisate: IngredientAfisat[] = ingrediente.map((i) => {
    const { stare, zile } = stareaIngredientului(i.produsId, casa);
    return {
      id: i.id,
      textOriginal: i.textOriginal,
      produsId: i.produsId,
      nume: i.nume ?? i.textOriginal,
      cantitate: i.cantitate,
      unitate: i.unitate,
      optional: i.optional,
      stare,
      zilePanaLaExpirare: zile,
    };
  });

  // La socoteala „ai / n-ai” intră doar ce contează: nu opționalele, nu sarea,
  // și nu ce n-am legat încă de catalog.
  const numarate = afisate.filter((i) => !i.optional && (i.stare === "ai" || i.stare === "lipsa"));

  return {
    id: reteta.id,
    titlu: reteta.titlu,
    pozaUrl: reteta.pozaUrl,
    portii: reteta.portii,
    minuteTotal: reteta.minuteTotal,
    laTm6: reteta.laTm6,
    efort: reteta.efort,
    etichete: reteta.etichete,
    favorit: reteta.favorit,
    sursa: reteta.sursa,
    url: reteta.url,
    instructiuni: reteta.instructiuni,
    ingrediente: afisate,
    ai: numarate.filter((i) => i.stare === "ai").length,
    dinTotal: numarate.length,
    expiraInEa: afisate
      .filter((i) => i.zilePanaLaExpirare != null && i.zilePanaLaExpirare <= EXPIRA_CURAND)
      .map((i) => ({ nume: i.nume, zile: i.zilePanaLaExpirare! }))
      .sort((a, b) => a.zile - b.zile),
    ultimaGatireLa: casa.ultimaGatire.get(reteta.id) ?? null,
  };
}

async function ingredienteleLor(retetaIds: number[]) {
  if (retetaIds.length === 0) return new Map<number, (typeof ingredienteReteta.$inferSelect & { nume: string | null })[]>();

  const randuri = await db
    .select({
      id: ingredienteReteta.id,
      retetaId: ingredienteReteta.retetaId,
      textOriginal: ingredienteReteta.textOriginal,
      produsId: ingredienteReteta.produsId,
      cantitate: ingredienteReteta.cantitate,
      unitate: ingredienteReteta.unitate,
      optional: ingredienteReteta.optional,
      nume: produse.nume,
    })
    .from(ingredienteReteta)
    .leftJoin(produse, eq(ingredienteReteta.produsId, produse.id))
    .where(inArray(ingredienteReteta.retetaId, retetaIds))
    .orderBy(asc(ingredienteReteta.id));

  const peRetete = new Map<number, typeof randuri>();
  for (const rand of randuri) {
    const lista = peRetete.get(rand.retetaId);
    if (lista) lista.push(rand);
    else peRetete.set(rand.retetaId, [rand]);
  }
  return peRetete;
}

export async function caietulDeRetete(ziua = azi()): Promise<RetetaAfisata[]> {
  const toate = await db.select().from(retete).orderBy(asc(retete.titlu));
  if (toate.length === 0) return [];

  const [casa, ingrediente] = await Promise.all([
    stareaCasei(ziua),
    ingredienteleLor(toate.map((r) => r.id)),
  ]);

  return toate
    .map((r) => compune(r, ingrediente.get(r.id) ?? [], casa))
    .sort((a, b) => a.titlu.localeCompare(b.titlu, "ro"));
}

export async function reteta(id: number, ziua = azi()): Promise<RetetaAfisata | null> {
  const [rand] = await db.select().from(retete).where(eq(retete.id, id)).limit(1);
  if (!rand) return null;

  const [casa, ingrediente] = await Promise.all([stareaCasei(ziua), ingredienteleLor([id])]);
  return compune(rand, ingrediente.get(id) ?? [], casa);
}

/* ----------------------------------------------------------- scrierea lor */

export async function salveazaReteta(date: DateReteta) {
  const valori = {
    titlu: date.titlu.trim(),
    portii: date.portii,
    minuteTotal: date.minuteTotal,
    laTm6: date.laTm6,
    efort: date.efort,
    url: date.url?.trim() || null,
    instructiuni: date.instructiuni?.trim() || null,
    etichete: date.etichete,
    // O rețetă cu link către Cookidoo rămâne o rețetă Cookidoo, oriunde ar fi
    // fost scrisă: așa o recunoaștem la sincronizare, când va veni.
    sursa: date.url?.includes("cookidoo") ? "cookidoo" : date.url ? "link" : "manual",
  };

  if (date.id) {
    await db.update(retete).set(valori).where(eq(retete.id, date.id));
    return date.id;
  }

  const [nou] = await db.insert(retete).values(valori).returning({ id: retete.id });
  return nou.id;
}

export async function stergeReteta(id: number) {
  // Mesele deja gătite rămân în istoric, doar își pierd legătura cu rețeta.
  await db
    .update(planMese)
    .set({ retetaId: null, textLiber: (await reteta(id))?.titlu ?? "Rețetă ștearsă" })
    .where(eq(planMese.retetaId, id));

  await db.delete(retete).where(eq(retete.id, id));
}

export async function comutaFavorit(id: number) {
  const [rand] = await db.select({ favorit: retete.favorit }).from(retete).where(eq(retete.id, id));
  if (!rand) return;
  await db.update(retete).set({ favorit: !rand.favorit }).where(eq(retete.id, id));
}

export async function adaugaIngredient(
  retetaId: number,
  ingredient: {
    textOriginal: string;
    produsId?: number | null;
    cantitate?: number | null;
    unitate?: string | null;
    optional?: boolean;
  },
) {
  const curat = ingredient.textOriginal.trim();
  if (!curat) return;

  await db.insert(ingredienteReteta).values({
    retetaId,
    textOriginal: curat,
    produsId: ingredient.produsId ?? null,
    cantitate: ingredient.cantitate ?? null,
    unitate: ingredient.unitate ?? null,
    optional: ingredient.optional ?? false,
  });
}

/** Leagă un ingredient de un produs din catalog — de aici încolo știm dacă îl ai. */
export async function leagaIngredientul(id: number, produsId: number | null) {
  await db.update(ingredienteReteta).set({ produsId }).where(eq(ingredienteReteta.id, id));
}

export async function stergeIngredient(id: number) {
  await db.delete(ingredienteReteta).where(eq(ingredienteReteta.id, id));
}

/* ------------------------------------------------------------- planul de mese */

export async function planulSaptamanii(deLa: string, panaLa: string): Promise<MasaDinPlan[]> {
  const randuri = await db
    .select({
      id: planMese.id,
      data: planMese.data,
      moment: planMese.moment,
      retetaId: planMese.retetaId,
      textLiber: planMese.textLiber,
      titlu: retete.titlu,
      gatitLa: planMese.gatitLa,
    })
    .from(planMese)
    .leftJoin(retete, eq(planMese.retetaId, retete.id))
    .where(and(gte(planMese.data, deLa), lte(planMese.data, panaLa)))
    .orderBy(asc(planMese.data));

  return randuri.map((r) => ({
    id: r.id,
    data: r.data,
    moment: r.moment,
    retetaId: r.retetaId,
    titlu: r.titlu ?? r.textLiber ?? "Ceva",
    gatitLa: r.gatitLa,
  }));
}

/** Ce s-a hotărât deja pentru o masă anume. */
export async function masaDin(ziua: string, moment: string) {
  const [rand] = await db
    .select({ id: planMese.id, retetaId: planMese.retetaId, gatitLa: planMese.gatitLa })
    .from(planMese)
    .where(and(eq(planMese.data, ziua), eq(planMese.moment, moment)))
    .limit(1);

  return rand ?? null;
}

export async function pusInPlan(data: string, moment: string, retetaId: number) {
  const [existent] = await db
    .select({ id: planMese.id })
    .from(planMese)
    .where(and(eq(planMese.data, data), eq(planMese.moment, moment)))
    .limit(1);

  // O masă pe moment: dacă pui alta la aceeași cină, o înlocuiește. Altfel s-ar
  // aduna trei cine în aceeași zi și n-ar mai însemna nimic.
  if (existent) {
    await db
      .update(planMese)
      .set({ retetaId, textLiber: null, gatitLa: null, gatitDe: null })
      .where(eq(planMese.id, existent.id));
    return existent.id;
  }

  const [nou] = await db
    .insert(planMese)
    .values({ data, moment, retetaId })
    .returning({ id: planMese.id });
  return nou.id;
}

export async function scosDinPlan(id: number) {
  await db.delete(planMese).where(eq(planMese.id, id));
}

/**
 * „Am gătit-o.” Intră în istoric, ceea ce face ca rețeta să nu se mai propună
 * mâine. Ce s-a terminat din cămară se bifează separat — nu ghicim cantități.
 */
export async function marcheazaGatit(id: number, persoanaId: number) {
  await db
    .update(planMese)
    .set({ gatitLa: Math.floor(Date.now() / 1000), gatitDe: persoanaId })
    .where(eq(planMese.id, id));
}

/** Gătit fără să fi fost în plan — se întâmplă mai des decât planul. */
export async function gatitPeLoc(retetaId: number, persoanaId: number, ziua = azi()) {
  const id = await pusInPlan(ziua, "cina", retetaId);
  await marcheazaGatit(id, persoanaId);
  return id;
}

/* -------------------------------------------------------------- lipsurile */

/** Ce lipsește din casă pentru mesele planificate într-un interval. */
export async function lipsurilePlanului(deLa: string, panaLa: string, ziua = azi()) {
  const mese = await planulSaptamanii(deLa, panaLa);
  const retetaIds = [...new Set(mese.filter((m) => !m.gatitLa && m.retetaId).map((m) => m.retetaId!))];
  if (retetaIds.length === 0) return [];

  const [casa, ingrediente] = await Promise.all([
    stareaCasei(ziua),
    ingredienteleLor(retetaIds),
  ]);

  const lipsuri = new Map<number, { produsId: number; nume: string; pentru: string[] }>();

  for (const retetaId of retetaIds) {
    const titlu = mese.find((m) => m.retetaId === retetaId)?.titlu ?? "";
    for (const i of ingrediente.get(retetaId) ?? []) {
      if (i.optional || i.produsId == null) continue;
      if (stareaIngredientului(i.produsId, casa).stare !== "lipsa") continue;

      const deja = lipsuri.get(i.produsId);
      if (deja) deja.pentru.push(titlu);
      else lipsuri.set(i.produsId, { produsId: i.produsId, nume: i.nume ?? i.textOriginal, pentru: [titlu] });
    }
  }

  return [...lipsuri.values()].sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
}

/**
 * Trece lipsurile pe lista de cumpărături, cu prețul lor din catalog.
 *
 * Ce e deja pe listă și nebifat nu se adaugă a doua oară — altfel ai pleca la
 * magazin cu „ceapă” scris de trei ori, din trei rețete.
 */
export async function punePeLista(produsIds: number[], persoanaId: number) {
  if (produsIds.length === 0) return 0;

  const lista = await listaCurenta();

  const peLista = await db
    .select({ produsId: articoleLista.produsId })
    .from(articoleLista)
    .where(and(eq(articoleLista.listaId, lista.id), eq(articoleLista.bifat, false)));

  const deja = new Set(peLista.map((a) => a.produsId));
  const deAdaugat = produsIds.filter((id) => !deja.has(id));
  if (deAdaugat.length === 0) return 0;

  const catalog = await db
    .select({
      id: produse.id,
      unitate: produse.unitate,
      cantitateImplicita: produse.cantitateImplicita,
      pretUltim: produse.pretUltim,
    })
    .from(produse)
    .where(inArray(produse.id, deAdaugat));

  await db.insert(articoleLista).values(
    catalog.map((p) => ({
      listaId: lista.id,
      produsId: p.id,
      cantitate: p.cantitateImplicita,
      unitate: p.unitate,
      pretEstimat: p.pretUltim,
      adaugatDe: persoanaId,
    })),
  );

  return catalog.length;
}

/**
 * Catalogul, așa cum îl vede cineva care scrie o rețetă: grupat pe raioane, cu
 * prețul știut, și cu semn pentru ce e deja în casă.
 */
export async function produsePentruLegat() {
  const [randuri, inCamara] = await Promise.all([
    db
      .select({
        id: produse.id,
        nume: produse.nume,
        unitate: produse.unitate,
        mereuInCasa: produse.mereuInCasa,
        pretUltim: produse.pretUltim,
        categorie: categorii.nume,
        ordineCategorie: categorii.ordine,
      })
      .from(produse)
      .leftJoin(categorii, eq(produse.categorieId, categorii.id))
      .where(eq(produse.arhivat, false)),
    db.select({ produsId: stoc.produsId }).from(stoc).where(isNull(stoc.consumatLa)),
  ]);

  const inCasa = new Set(inCamara.map((r) => r.produsId));

  return randuri
    .map((r) => ({
      ...r,
      categorie: r.categorie ?? "Altele",
      ordineCategorie: r.ordineCategorie ?? 999,
      inCasa: inCasa.has(r.id),
    }))
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
}

/**
 * Produsul cu numele ăsta din catalog, sau unul nou dacă nu există.
 *
 * Rețetele cer lucruri care nu se cumpără des — anason, lapte de cocos — și n-are
 * sens să fugi în alt ecran ca să le pui în catalog. Căutăm întâi fără să ținem
 * cont de majuscule, ca „ceapă” să nu facă o a doua „Ceapă”.
 */
export async function produsDupaNume(nume: string) {
  const curat = nume.trim();
  if (!curat) return null;

  const toate = await db
    .select({ id: produse.id, nume: produse.nume, unitate: produse.unitate })
    .from(produse)
    .where(eq(produse.arhivat, false));

  const existent = toate.find((p) => p.nume.localeCompare(curat, "ro", { sensitivity: "base" }) === 0);
  if (existent) return existent;

  const numeFrumos = curat.charAt(0).toLocaleUpperCase("ro") + curat.slice(1);
  const [nou] = await db
    .insert(produse)
    .values({ nume: numeFrumos })
    .returning({ id: produse.id, nume: produse.nume, unitate: produse.unitate });

  return nou;
}

/** Ce e acum în cămară dintr-o rețetă — pentru „s-a terminat ceva?” după gătit. */
export async function dinCamaraPentru(retetaId: number) {
  const ingrediente = (await ingredienteleLor([retetaId])).get(retetaId) ?? [];
  const produsIds = ingrediente.map((i) => i.produsId).filter((id): id is number => id != null);
  if (produsIds.length === 0) return [];

  return db
    .select({
      id: stoc.id,
      nume: produse.nume,
      cantitate: stoc.cantitate,
      unitate: stoc.unitate,
      loc: stoc.loc,
    })
    .from(stoc)
    .innerJoin(produse, eq(stoc.produsId, produse.id))
    .where(and(isNull(stoc.consumatLa), inArray(stoc.produsId, produsIds)))
    .orderBy(asc(produse.nume));
}
