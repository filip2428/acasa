import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { persoane } from "@/lib/db/schema";
import type { PropunereMeniu, RetetaAfisata } from "@/lib/domeniu";
import { azi, inRomania, zileIntre } from "@/lib/formatare";
import { evenimenteGoogle } from "@/lib/servicii/calendar-google";
import { areGoogle } from "@/lib/servicii/google";
import { caietulDeRetete } from "@/lib/servicii/retete";
import { motivulPropunerii, scorulRetetei } from "@/lib/servicii/socoteli-meniu";

/*
  „Ce gătim azi.”

  Aceeași idee ca la propunerea de treburi: aplicația are voie să spună ce să
  faci doar dacă știe destule ca să nu spună o prostie. Aici știe trei lucruri —
  ce e în cămară, ce stă să expire și dacă ai seara liberă — și le spune pe toate
  în motivul propunerii.
*/

/** Seara, pentru gătit: între 17:00 și 21:00. */
const SEARA = { de_la: 17 * 60, pana_la: 21 * 60 };

/** Are ceva în calendar diseară? Fără calendar legat, presupunem că e liber. */
export async function searaEsteOcupata(persoanaId: number, ziua = azi()) {
  if (!areGoogle()) return false;

  const [persoana] = await db
    .select({ calendarId: persoane.calendarGoogleId })
    .from(persoane)
    .where(eq(persoane.id, persoanaId))
    .limit(1);

  if (!persoana?.calendarId) return false;

  try {
    const program = await evenimenteGoogle(persoana.calendarId, ziua, ziua);
    return program.some(
      (e) =>
        e.ocupa &&
        !e.toataZiua &&
        e.incepe != null &&
        e.incepe < SEARA.pana_la &&
        (e.seTermina ?? e.incepe + 60) > SEARA.de_la,
    );
  } catch {
    // Dacă nu putem citi calendarul, mai bine nu ne prefacem că știm.
    return false;
  }
}

function cuScor(retete: RetetaAfisata[], searaOcupata: boolean, ziua: string) {
  return retete
    .map((r) => {
      const lipsuri = r.dinTotal - r.ai;
      const date = {
        lipsuri,
        necesare: r.dinTotal,
        expiraInEa: r.expiraInEa.length,
        zileDeLaUltimaGatire: r.ultimaGatireLa ? zileIntre(r.ultimaGatireLa, ziua) : null,
        favorit: r.favorit,
        minuteTotal: r.minuteTotal,
        searaOcupata,
      };

      return {
        ...r,
        scor: scorulRetetei(date),
        motiv: motivulPropunerii(date, {
          primulCareExpira: r.expiraInEa[0],
          primaLipsa: r.ingrediente.find((i) => i.stare === "lipsa")?.nume,
        }),
      };
    })
    .sort((a, b) => b.scor - a.scor);
}

/** Toate rețetele, în ordinea în care merită gătite azi. */
export async function cePotGati(persoanaId: number, ziua = azi()) {
  const [toate, ocupat] = await Promise.all([
    caietulDeRetete(ziua),
    searaEsteOcupata(persoanaId, ziua),
  ]);

  return cuScor(toate, ocupat, ziua);
}

export type RetetaPropusa = Awaited<ReturnType<typeof cePotGati>>[number];

/**
 * Propunerea de pe ecranul „Azi”: una singură, cu motivul ei.
 *
 * Tace în trei situații, dinadins: dacă nu sunt rețete, dacă masa de azi e deja
 * pusă în plan (atunci nu mai e nimic de hotărât), și dacă tot ce avem sunt
 * rețete pentru care lipsește aproape tot — o propunere care începe cu un drum
 * la magazin nu e o propunere.
 */
export async function propunereaDeMeniu(
  persoanaId: number,
  ziua = azi(),
  masaPusaDeja = false,
): Promise<PropunereMeniu | null> {
  if (masaPusaDeja) return null;

  // Dimineața nu-ți spune nimeni ce să gătești diseară; întrebarea vine spre prânz.
  const { ora } = inRomania();
  if (ora < 10) return null;

  const clasate = await cePotGati(persoanaId, ziua);
  const prima = clasate[0];
  if (!prima) return null;

  const lipsuri = prima.dinTotal - prima.ai;
  const preaMulteLipsuri = prima.dinTotal > 0 && lipsuri > Math.ceil(prima.dinTotal / 2);
  if (preaMulteLipsuri && prima.expiraInEa.length === 0) return null;

  return { reteta: prima, motiv: prima.motiv };
}
