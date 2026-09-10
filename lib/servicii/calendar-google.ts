import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { persoane } from "@/lib/db/schema";
import type { AgendaPersoanei, EvenimentGoogle } from "@/lib/domeniu";
import { azi, inRomania } from "@/lib/formatare";
import { areGoogle, cereGoogle, codulErorii } from "@/lib/servicii/google";

/*
  Calendarele Google ale celor doi.

  Fiecare își partajează calendarul lui, separat, cu adresa contului de serviciu.
  Nu cerem parola nimănui și nu vedem nimic altceva: dacă cineva oprește
  partajarea, aplicația pur și simplu nu mai are ce citi.

  Două drepturi diferite, pentru două lucruri diferite:
  - „Vizualizați toate detaliile evenimentelor” ajunge ca să *citim* programul;
  - „Faceți modificări la evenimente” trebuie doar dacă vrei să poți trece ceva
    din aplicație *în* Google. E opțional, și nu e niciodată implicit.
*/

const API = "https://www.googleapis.com/calendar/v3";

const adresa = (calendarId: string) => `${API}/calendars/${encodeURIComponent(calendarId)}`;

const FUS = "Europe/Bucharest";

/* ------------------------------------------------------------------ citire */

type RaspunsEvenimente = {
  items?: {
    id: string;
    status?: string;
    summary?: string;
    transparency?: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
  }[];
};

/** Ziua următoare, ca „AAAA-LL-ZZ”. */
function ziuaUrmatoare(zi: string) {
  const d = new Date(`${zi}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return azi(d);
}

/**
 * Evenimentele dintr-un calendar, între două zile (inclusiv).
 *
 * Cerem un interval mai larg cu o zi de fiecare parte și tăiem noi la loc după
 * ora României. Altfel un eveniment de la 23:30 ar cădea în ziua greșită vara,
 * când decalajul e de trei ore, nu de două.
 */
export async function evenimenteGoogle(
  calendarId: string,
  deLa: string,
  panaLa: string,
): Promise<EvenimentGoogle[]> {
  const parametri = new URLSearchParams({
    timeMin: `${deLa}T00:00:00Z`,
    timeMax: `${ziuaUrmatoare(panaLa)}T23:59:59Z`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const raspuns = await cereGoogle<RaspunsEvenimente>(`${adresa(calendarId)}/events?${parametri}`);

  const iesire: EvenimentGoogle[] = [];

  for (const item of raspuns.items ?? []) {
    if (item.status === "cancelled") continue;

    const titlu = item.summary?.trim() || "(fără titlu)";
    // Marcat „Disponibil” în Google: apare în calendar, dar nu ocupă timpul.
    const ocupa = item.transparency !== "transparent";

    if (item.start?.date) {
      // Toată ziua. Google dă sfârșitul exclusiv, deci o excursie 12–14 are
      // end.date = 15; mergem zi cu zi până înainte de el.
      const sfarsit = item.end?.date ?? ziuaUrmatoare(item.start.date);
      for (let zi = item.start.date; zi < sfarsit && zi <= panaLa; zi = ziuaUrmatoare(zi)) {
        if (zi < deLa) continue;
        iesire.push({
          id: `${item.id}:${zi}`,
          idGoogle: item.id,
          titlu,
          ziua: zi,
          toataZiua: true,
          ora: null,
          oraSfarsit: null,
          incepe: null,
          seTermina: null,
          ocupa,
        });
      }
      continue;
    }

    if (!item.start?.dateTime) continue;

    const inceput = inRomania(new Date(item.start.dateTime));
    if (inceput.ziua < deLa || inceput.ziua > panaLa) continue;

    const sfarsit = item.end?.dateTime ? inRomania(new Date(item.end.dateTime)) : null;

    iesire.push({
      id: item.id,
      idGoogle: item.id,
      titlu,
      ziua: inceput.ziua,
      toataZiua: false,
      ora: inceput.ceas,
      oraSfarsit: sfarsit && sfarsit.ziua === inceput.ziua ? sfarsit.ceas : null,
      incepe: inceput.minutDinZi,
      // Un eveniment care trece de miezul nopții ocupă ziua până la capăt.
      seTermina: sfarsit ? (sfarsit.ziua === inceput.ziua ? sfarsit.minutDinZi : 24 * 60) : null,
      ocupa,
    });
  }

  return iesire;
}

/** Traduce eșecurile Google în ceva ce se poate repara fără să deschizi consola. */
function explica(eroare: unknown) {
  const cod = codulErorii(eroare);
  if (cod === 404) {
    return "Calendarul nu e partajat cu aplicația, sau adresa lui e greșită.";
  }
  if (cod === 403) {
    return "Google refuză accesul. Verifică partajarea calendarului.";
  }
  return eroare instanceof Error ? eroare.message : "Ceva n-a mers la Google.";
}

/** Programul amândurora, pe un interval. Un calendar stricat nu-l ascunde pe celălalt. */
export async function agendaCasei(deLa: string, panaLa: string): Promise<AgendaPersoanei[]> {
  const toti = await db
    .select({ id: persoane.id, nume: persoane.nume, calendarId: persoane.calendarGoogleId })
    .from(persoane)
    .where(eq(persoane.activ, true));

  return Promise.all(
    toti.map(async (p): Promise<AgendaPersoanei> => {
      const gol = {
        persoanaId: p.id,
        nume: p.nume,
        calendarId: p.calendarId,
        evenimente: [] as EvenimentGoogle[],
      };

      if (!areGoogle() || !p.calendarId) return { ...gol, eroare: null };

      try {
        return { ...gol, evenimente: await evenimenteGoogle(p.calendarId, deLa, panaLa), eroare: null };
      } catch (eroare) {
        return { ...gol, eroare: explica(eroare) };
      }
    }),
  );
}

/** Verificare din Setări: merge sau nu, și de ce nu. */
export async function incearcaCalendarul(calendarId: string) {
  const acum = azi();
  const peste = new Date();
  peste.setDate(peste.getDate() + 30);

  try {
    const gasite = await evenimenteGoogle(calendarId.trim(), acum, azi(peste));
    return { merge: true as const, cate: gasite.length };
  } catch (eroare) {
    return { merge: false as const, motiv: explica(eroare) };
  }
}

/* ------------------------------------------------------------------ scriere */

/**
 * Trece ceva din aplicație în Google, ca eveniment de-o zi.
 *
 * Se cheamă doar când cineva bifează explicit. Nimic nu pleacă spre Google de
 * la sine.
 */
export async function pune(
  calendarId: string,
  eveniment: { titlu: string; ziua: string; notite?: string | null },
) {
  const raspuns = await cereGoogle<{ id: string }>(`${adresa(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: eveniment.titlu,
      description: [eveniment.notite, "Trecut din aplicația Acasă."]
        .filter(Boolean)
        .join("\n\n"),
      start: { date: eveniment.ziua },
      // La evenimentele de-o zi, Google vrea sfârșitul în ziua următoare.
      end: { date: ziuaUrmatoare(eveniment.ziua) },
    }),
  });
  return raspuns.id;
}

/**
 * Pune ceva la o oră anume — folosit când cineva acceptă o propunere de genul
 * „ai loc joi la 17:00”. Ora se scrie explicit pe fusul României, ca să nu
 * depindă de fusul serverului.
 */
export async function puneLaOra(
  calendarId: string,
  eveniment: { titlu: string; ziua: string; ora: string; minute: number },
) {
  const [h, m] = eveniment.ora.split(":").map(Number);
  const sfarsit = h * 60 + m + eveniment.minute;
  const oraSfarsit = `${String(Math.floor(sfarsit / 60)).padStart(2, "0")}:${String(
    sfarsit % 60,
  ).padStart(2, "0")}`;

  const raspuns = await cereGoogle<{ id: string }>(`${adresa(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: eveniment.titlu,
      description: "Propus de aplicația Acasă.",
      start: { dateTime: `${eveniment.ziua}T${eveniment.ora}:00`, timeZone: FUS },
      end: { dateTime: `${eveniment.ziua}T${oraSfarsit}:00`, timeZone: FUS },
    }),
  });

  return raspuns.id;
}

/** Actualizează în Google un eveniment deja trecut acolo (titlu nou, altă zi). */
export async function actualizeaza(
  calendarId: string,
  evenimentId: string,
  eveniment: { titlu?: string; ziua?: string },
) {
  const corp: Record<string, unknown> = {};
  if (eveniment.titlu) corp.summary = eveniment.titlu;
  if (eveniment.ziua) {
    corp.start = { date: eveniment.ziua };
    corp.end = { date: ziuaUrmatoare(eveniment.ziua) };
  }

  await cereGoogle(`${adresa(calendarId)}/events/${encodeURIComponent(evenimentId)}`, {
    method: "PATCH",
    body: JSON.stringify(corp),
  });
}

export async function scoate(calendarId: string, evenimentId: string) {
  await cereGoogle(`${adresa(calendarId)}/events/${encodeURIComponent(evenimentId)}`, {
    method: "DELETE",
  });
}

/** Explicația unei scrieri eșuate, pentru ecran. */
export function deCeNuSePoateScrie(eroare: unknown) {
  if (codulErorii(eroare) === 403) {
    return "Calendarul e partajat doar la citire. Ca să putem scrie în el, treci partajarea pe „Faceți modificări la evenimente”.";
  }
  return explica(eroare);
}
