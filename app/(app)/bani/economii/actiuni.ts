"use server";

import { revalidatePath } from "next/cache";

import type { StareRaspuns } from "@/componente/Raspuns";
import { db } from "@/lib/db";
import { tranzactii } from "@/lib/db/schema";
import * as economii from "@/lib/servicii/economii";
import { ceruteSesiune } from "@/lib/sesiune";

/*
  Acțiunile ecranelor de economii. Fiecare verifică sesiunea, cheamă serviciul
  (care recitește foaia și verifică tot înainte să scrie) și întoarce un mesaj
  sau eroarea, în cuvinte. Nimic nu aruncă spre ecran.
*/

async function ruleaza(fn: () => Promise<string>): Promise<StareRaspuns> {
  await ceruteSesiune();
  try {
    const mesaj = await fn();
    revalidatePath("/bani", "layout");
    revalidatePath("/");
    return { mesaj };
  } catch (eroare) {
    console.error("Operație de economii eșuată:", eroare);
    return { eroare: eroare instanceof Error ? eroare.message : String(eroare) };
  }
}

const nr = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const randSauNull = (v: unknown) => (v === "" || v == null || v === "venit" ? null : nr(v));

export async function transferuriLunii(d: {
  sursa: string | number | null;
  randuri: { categorie: string; suma: number; cont: string | number | null; primit?: number | null }[];
}) {
  return ruleaza(() =>
    economii.transferaLuna(
      d.randuri.map((r) => ({ categorie: String(r.categorie), suma: nr(r.suma), cont: randSauNull(r.cont), primit: r.primit == null ? null : nr(r.primit) })),
      randSauNull(d.sursa),
    ),
  );
}

export async function mutaBani(d: { din: number; spre: number; suma: number; primit?: number | null; nota?: string }) {
  return ruleaza(() => economii.mutaBani({ din: nr(d.din), spre: nr(d.spre), suma: nr(d.suma), primit: d.primit == null ? null : nr(d.primit), nota: String(d.nota ?? "") }));
}

export async function deschideCont(d: {
  tip: string; institutie: string; produs?: string; moneda: string; suma: number; sursa: string | number | null;
  dobanda: number; luni?: number | null; data: string; scop: string; titular: string;
}) {
  return ruleaza(() => economii.deschideCont({ ...d, suma: nr(d.suma), dobanda: nr(d.dobanda), luni: d.luni == null ? null : nr(d.luni), sursa: randSauNull(d.sursa) }));
}

export async function scadenta(d: {
  rand: number; dobanda: number; actiune: "prelungeste" | "lichideaza"; rataNoua?: number; luni?: number;
  capitalizeaza?: boolean; contDobanda?: number | null; contLichidare?: number | null;
}) {
  return ruleaza(() => economii.scadenta({ ...d, rand: nr(d.rand), dobanda: nr(d.dobanda), rataNoua: nr(d.rataNoua), luni: nr(d.luni),
    contDobanda: randSauNull(d.contDobanda), contLichidare: randSauNull(d.contLichidare) }));
}

export async function actualizeazaSolduri(lista: { rand: number; sold: number }[]) {
  return ruleaza(() => economii.actualizeazaSolduri(lista.map((x) => ({ rand: nr(x.rand), sold: nr(x.sold) }))));
}

export async function inchideCont(d: { rand: number; destinatie: number | "afara"; primit?: number | null; dobanda?: number; nota?: string }) {
  return ruleaza(() => economii.inchideCont({ ...d, rand: nr(d.rand), destinatie: d.destinatie === "afara" ? "afara" : nr(d.destinatie),
    primit: d.primit == null ? null : nr(d.primit), dobanda: nr(d.dobanda) }));
}

export async function seteazaTinta(d: { nume: string; tinta: number | null; panaLa: string | null }) {
  return ruleaza(() => economii.seteazaTinta(d.nume, d.tinta == null ? null : nr(d.tinta), d.panaLa || null));
}

export async function venitOcazional(d: Parameters<typeof economii.venitOcazional>[0]) {
  return ruleaza(() => economii.venitOcazional({ ...d, suma: nr(d.suma), investitii: nr(d.investitii), sumaFond: nr(d.sumaFond),
    guiltFreeFilip: nr(d.guiltFreeFilip), guiltFreeRalu: nr(d.guiltFreeRalu) }));
}

/**
 * O cheltuială plătită din economii. Se scrie direct în foaie (nu prin coada de
 * reîncercare: fără internet n-am ști soldul contului). În copia locală intră
 * doar după ce a ajuns în foaie, ca să apară în Istoric.
 */
export async function platesteDinEconomii(d: {
  data: string; categorie: string; suma: number; descriere: string; finantare: string; cont: string | number | null;
}): Promise<StareRaspuns> {
  const sesiune = await ceruteSesiune();
  const rezultat = await ruleaza(() => economii.platesteDinEconomii({ ...d, suma: nr(d.suma), cont: randSauNull(d.cont) }));
  if (rezultat.mesaj) {
    await db.insert(tranzactii).values({
      luna: d.data.slice(0, 7), data: d.data, categorie: d.categorie, suma: nr(d.suma),
      descriere: [d.descriere.trim(), d.finantare.toLowerCase()].filter(Boolean).join(" · "),
      sursa: "manual", adaugatDe: sesiune.persoanaId, trimisLa: Math.floor(Date.now() / 1000),
    });
  }
  return rezultat;
}
