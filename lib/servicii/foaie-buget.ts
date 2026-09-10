import "server-only";

import { citesteAsezarea, litere, verificaIntervalul } from "./asezare-foaie";
import { cereGoogle } from "./google";

/*
  Scrisul în foaia Buget_Familial.

  Partea grea — unde stau coloanele și unde se termină tranzacțiile — e în
  `asezare-foaie.ts`, ca funcții pure verificabile fără Google. Aici rămân doar
  cererile de rețea.
*/

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

function sheetId() {
  const id = process.env.BUGET_SHEET_ID;
  if (!id) throw new Error("Lipsește BUGET_SHEET_ID din .env.local.");
  return id;
}

type RaspunsValori = { values?: unknown[][] };
type Foaie = { properties: { sheetId: number; title: string } };

async function foile(): Promise<Foaie[]> {
  const raspuns = await cereGoogle<{ sheets?: Foaie[] }>(
    `${SHEETS}/${sheetId()}?fields=sheets.properties(sheetId,title)`,
  );
  return raspuns.sheets ?? [];
}

/**
 * Se asigură că există foaia lunii. Dacă nu, o face din „Șablon Lunar” — exact
 * pasul 1 din instrucțiunile Tabloului de bord, doar că nu-l mai faci tu.
 */
export async function asiguraFoaiaLunii(luna: string) {
  const lista = await foile();
  if (lista.some((f) => f.properties.title === luna)) return { creata: false };

  const pozitie = lista.findIndex((f) => f.properties.title === "Șablon Lunar");
  if (pozitie < 0) {
    throw new Error(
      `Nu există foaia „${luna}” și nici „Șablon Lunar” din care s-o fac. ` +
        "Creeaz-o tu o dată, iar de luna viitoare mă descurc.",
    );
  }

  await cereGoogle(`${SHEETS}/${sheetId()}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          duplicateSheet: {
            sourceSheetId: lista[pozitie].properties.sheetId,
            newSheetName: luna,
            insertSheetIndex: pozitie + 1,
          },
        },
      ],
    }),
  });

  return { creata: true };
}

export type TranzactieDeScris = {
  data: string;
  categorie: string;
  suma: number;
  descriere?: string | null;
};

export type RezultatScriere = {
  primulRand: number;
  cate: number;
  foaieCreata: boolean;
  avertisment: string | null;
};

/** Adaugă tranzacții la coada tabelului din foaia lunii. */
export async function scrieTranzactii(
  luna: string,
  tranzactii: TranzactieDeScris[],
): Promise<RezultatScriere> {
  if (tranzactii.length === 0) {
    return { primulRand: 0, cate: 0, foaieCreata: false, avertisment: null };
  }

  const { creata } = await asiguraFoaiaLunii(luna);

  const citit = await cereGoogle<RaspunsValori>(
    `${SHEETS}/${sheetId()}/values/${encodeURIComponent(`${luna}!A1:Z600`)}` +
      "?valueRenderOption=UNFORMATTED_VALUE",
  );

  const asezare = citesteAsezarea(citit.values ?? []);
  if (!asezare) {
    throw new Error(
      "N-am găsit tabelul de tranzacții în foaia lunii. " +
        "Caut un rând cu „Data”, „Categorie” și „Sumă” unul lângă altul.",
    );
  }

  const de_la = asezare.randUrmator;
  const pana_la = de_la + tranzactii.length - 1;
  const interval = `${luna}!${litere(asezare.coloanaData)}${de_la}:${litere(
    asezare.coloanaDescriere,
  )}${pana_la}`;

  await cereGoogle(
    `${SHEETS}/${sheetId()}/values/${encodeURIComponent(interval)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({
        values: tranzactii.map((t) => [t.data, t.categorie, t.suma, t.descriere ?? ""]),
      }),
    },
  );

  // Abia după scriere ne uităm la formule: verificarea e un plus, nu o condiție.
  let avertisment: string | null = null;
  try {
    const formule = await cereGoogle<RaspunsValori>(
      `${SHEETS}/${sheetId()}/values/${encodeURIComponent(`${luna}!D1:D60`)}` +
        "?valueRenderOption=FORMULA",
    );
    avertisment = verificaIntervalul(formule.values ?? [], pana_la, [
      litere(asezare.coloanaData),
      litere(asezare.coloanaCategorie),
      litere(asezare.coloanaSuma),
      litere(asezare.coloanaDescriere),
    ]);
  } catch {
    // Nu blocăm nimic dacă citirea formulelor eșuează.
  }

  return { primulRand: de_la, cate: tranzactii.length, foaieCreata: creata, avertisment };
}
