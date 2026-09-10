import "server-only";

import { eq, sql } from "drizzle-orm";
import webpush from "web-push";

import { db } from "@/lib/db";
import { abonamentePush } from "@/lib/db/schema";

/*
  Notificări push.

  Pe iPhone merg doar din aplicația instalată pe ecranul principal (iOS 16.4+),
  iar permisiunea trebuie cerută dintr-o atingere a utilizatorului, nu la
  încărcarea paginii. Amândouă sunt tratate în `componente/Notificari.tsx`.

  Un abonament poate muri fără să ne anunțe nimeni — telefon resetat, aplicație
  scoasă de pe ecran. Când browserul răspunde 404 sau 410, îl ștergem; la alte
  erori doar numărăm eșecurile și renunțăm după câteva la rând.
*/

const MAX_ESECURI = 5;

export function arePush() {
  return Boolean(process.env.VAPID_CHEIE_PUBLICA && process.env.VAPID_CHEIE_PRIVATA);
}

export function cheiePublica() {
  return process.env.VAPID_CHEIE_PUBLICA ?? null;
}

function pregateste() {
  if (!arePush()) throw new Error("Lipsesc cheile VAPID. Rulează `npm run pregatire`.");
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT ?? "mailto:acasa@example.com",
    process.env.VAPID_CHEIE_PUBLICA!,
    process.env.VAPID_CHEIE_PRIVATA!,
  );
}

export type Instiintare = {
  titlu: string;
  text: string;
  /** Unde duce atingerea notificării. */
  cale?: string;
  /** Notificările cu aceeași etichetă se înlocuiesc, nu se adună. */
  eticheta?: string;
};

/** Trimite o înștiințare tuturor dispozitivelor unei persoane. */
export async function instiinteaza(persoanaId: number, mesaj: Instiintare) {
  if (!arePush()) return { trimise: 0, sterse: 0 };
  pregateste();

  const abonamente = await db
    .select()
    .from(abonamentePush)
    .where(eq(abonamentePush.persoanaId, persoanaId));

  let trimise = 0;
  let sterse = 0;

  for (const abonament of abonamente) {
    try {
      await webpush.sendNotification(
        {
          endpoint: abonament.endpoint,
          keys: { p256dh: abonament.cheieP256dh, auth: abonament.cheieAuth },
        },
        JSON.stringify(mesaj),
      );
      trimise += 1;
      await db
        .update(abonamentePush)
        .set({ ultimaReusitaLa: Math.floor(Date.now() / 1000), esecuriLaRand: 0 })
        .where(eq(abonamentePush.id, abonament.id));
    } catch (eroare) {
      const cod = (eroare as { statusCode?: number }).statusCode;

      if (cod === 404 || cod === 410) {
        // Abonamentul nu mai există: telefonul l-a aruncat.
        await db.delete(abonamentePush).where(eq(abonamentePush.id, abonament.id));
        sterse += 1;
        continue;
      }

      const esecuri = abonament.esecuriLaRand + 1;
      if (esecuri >= MAX_ESECURI) {
        await db.delete(abonamentePush).where(eq(abonamentePush.id, abonament.id));
        sterse += 1;
      } else {
        await db
          .update(abonamentePush)
          .set({ esecuriLaRand: esecuri })
          .where(eq(abonamentePush.id, abonament.id));
      }
    }
  }

  return { trimise, sterse };
}

export async function abonamenteleMele(persoanaId: number) {
  const [rand] = await db
    .select({ cate: sql<number>`count(*)` })
    .from(abonamentePush)
    .where(eq(abonamentePush.persoanaId, persoanaId));
  return rand?.cate ?? 0;
}
