import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { db } from "./db";
import { incercariAutentificare, persoane } from "./db/schema";
import { normalizeazaCod, verificaSecret } from "./autentificare";

/*
  Sesiunea: un JWT semnat, ținut într-un cookie httpOnly, valabil un an.

  E o aplicație pentru două persoane, instalată pe ecranul telefonului, deci
  nu are rost să-i cerem cuiva să se autentifice des. În schimb ne apărăm de
  încercări automate: maximum 8 încercări greșite la 15 minute, numărate și pe
  adresa IP, și pe codul public introdus.
*/

const NUME_COOKIE = "acasa_sesiune";
const DURATA_ZILE = 365;
const MAX_INCERCARI = 8;
const FEREASTRA_SECUNDE = 15 * 60;

function secret() {
  const valoare = process.env.SECRET_SESIUNE;
  if (!valoare) {
    throw new Error(
      "Lipsește SECRET_SESIUNE. Rulează `npm run pregatire` ca să generezi fișierul .env.local.",
    );
  }
  return new TextEncoder().encode(valoare);
}

export type Sesiune = { persoanaId: number; nume: string; esteAdmin: boolean };

async function adresaIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "necunoscut"
  );
}

async function prevaCheia(cheie: string) {
  const de_la = Math.floor(Date.now() / 1000) - FEREASTRA_SECUNDE;
  const [rand] = await db
    .select({ cate: sql<number>`count(*)` })
    .from(incercariAutentificare)
    .where(and(eq(incercariAutentificare.cheie, cheie), gt(incercariAutentificare.la, de_la)));
  return (rand?.cate ?? 0) >= MAX_INCERCARI;
}

/**
 * Verifică un cod de acces și creează sesiunea.
 * Întoarce un mesaj de eroare gata de afișat, sau `null` dacă a mers.
 */
export async function autentifica(codBrut: string): Promise<string | null> {
  const ip = await adresaIp();
  const desfacut = normalizeazaCod(codBrut);

  const chei = [`ip:${ip}`, ...(desfacut ? [`cod:${desfacut.codPublic}`] : [])];
  for (const cheie of chei) {
    if (await prevaCheia(cheie)) {
      return "Prea multe încercări. Mai încearcă peste 15 minute.";
    }
  }

  const inregistreazaEsec = async () => {
    await db.insert(incercariAutentificare).values(chei.map((cheie) => ({ cheie })));
  };

  if (!desfacut) {
    await inregistreazaEsec();
    return "Codul are 10 caractere, de forma ABCD-EFGHJK.";
  }

  const [persoana] = await db
    .select()
    .from(persoane)
    .where(and(eq(persoane.codPublic, desfacut.codPublic), eq(persoane.activ, true)))
    .limit(1);

  if (!persoana || !(await verificaSecret(desfacut.secret, persoana.codHash))) {
    await inregistreazaEsec();
    return "Codul nu e bun.";
  }

  const jeton = await new SignJWT({ nume: persoana.nume, esteAdmin: persoana.esteAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(persoana.id))
    .setIssuedAt()
    .setExpirationTime(`${DURATA_ZILE}d`)
    .sign(secret());

  const cos = await cookies();
  cos.set(NUME_COOKIE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURATA_ZILE * 24 * 60 * 60,
  });

  return null;
}

export async function iesi() {
  const cos = await cookies();
  cos.delete(NUME_COOKIE);
}

/**
 * Sesiunea curentă, sau `null`. Rezultatul e memorat pe durata unei cereri,
 * ca să nu verificăm acelaşi jeton de zece ori într-o singură pagină.
 */
export const sesiuneCurenta = cache(async (): Promise<Sesiune | null> => {
  const jeton = (await cookies()).get(NUME_COOKIE)?.value;
  if (!jeton) return null;
  try {
    const { payload } = await jwtVerify(jeton, secret());
    return {
      persoanaId: Number(payload.sub),
      nume: String(payload.nume ?? ""),
      esteAdmin: payload.esteAdmin === true,
    };
  } catch {
    return null;
  }
});

/** Ca `sesiuneCurenta`, dar aruncă dacă lipsește. De folosit în acțiuni. */
export async function ceruteSesiune() {
  const sesiune = await sesiuneCurenta();
  if (!sesiune) throw new Error("Trebuie să intri în cont.");
  return sesiune;
}
