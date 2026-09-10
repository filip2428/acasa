import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/*
  Autentificare prin cod de acces, fără email și fără parolă.

  Fișierul n-are „server-only” pentru că scripturile din `scripturi/` generează
  coduri cu el, în afara Next. Nu atinge nici baza de date, nici variabilele de
  mediu — doar criptografie — și nu e importat din nicio componentă de client.

  Codul are forma ABCD-EFGHJK:
  - primele 4 caractere sunt publice și servesc doar la găsirea persoanei;
  - ultimele 6 sunt secretul propriu-zis și se păstrează hash-uit cu scrypt.

  Împărțirea asta ne lasă să căutăm persoana printr-un index, fără să comparăm
  hash-ul cu toate rândurile din tabel.

  Alfabetul nu conține I, O, 0, 1 — sunt prea ușor de confundat când cineva
  dictează codul la telefon.
*/

const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LUNGIME_PUBLICA = 4;
const LUNGIME_SECRETA = 6;

function caractereAleatoare(cate: number) {
  // Respingem octeții care ar strica distribuția uniformă a alfabetului.
  const prag = 256 - (256 % ALFABET.length);
  let rezultat = "";
  while (rezultat.length < cate) {
    for (const octet of randomBytes(cate * 2)) {
      if (octet >= prag) continue;
      rezultat += ALFABET[octet % ALFABET.length];
      if (rezultat.length === cate) break;
    }
  }
  return rezultat;
}

export function genereazaCod() {
  const public_ = caractereAleatoare(LUNGIME_PUBLICA);
  const secret = caractereAleatoare(LUNGIME_SECRETA);
  return { codIntreg: `${public_}-${secret}`, codPublic: public_, secret };
}

/** Acceptă „abcd-efghjk”, „ABCDEFGHJK”, „abcd efghjk” și le aduce la forma canonică. */
export function normalizeazaCod(brut: string) {
  const curat = brut.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (curat.length !== LUNGIME_PUBLICA + LUNGIME_SECRETA) return null;
  return {
    codPublic: curat.slice(0, LUNGIME_PUBLICA),
    secret: curat.slice(LUNGIME_PUBLICA),
  };
}

export async function hashSecret(secret: string) {
  const sare = randomBytes(16);
  const cheie = (await scryptAsync(secret, sare, 32)) as Buffer;
  return `${sare.toString("hex")}:${cheie.toString("hex")}`;
}

export async function verificaSecret(secret: string, stocat: string) {
  const [sareHex, cheieHex] = stocat.split(":");
  if (!sareHex || !cheieHex) return false;
  const cheie = (await scryptAsync(secret, Buffer.from(sareHex, "hex"), 32)) as Buffer;
  const asteptat = Buffer.from(cheieHex, "hex");
  if (cheie.length !== asteptat.length) return false;
  return timingSafeEqual(cheie, asteptat);
}
