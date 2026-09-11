import { lunaCurenta } from "../lib/formatare.ts";
import { citesteAsezarea, litere, verificaIntervalul } from "../lib/servicii/asezare-foaie.ts";
import { cereGoogle } from "../lib/servicii/google.ts";

/*
  Verifică pe foaia adevărată că aplicația știe unde să scrie.

  Implicit face o probă în gol: citește foaia lunii curente, arată ce coloane a
  găsit și pe ce rând ar scrie următoarea cheltuială — dar nu scrie nimic.
  Bugetul vostru rămâne neatins.

  Cu `-- --chiar` face drumul întreg pe o foaie de unică folosință: duplică
  „Șablon Lunar” într-o filă numită PROBĂ-2099-01, scrie două rânduri, verifică
  dacă formulele le-au prins, apoi șterge fila. Nicio lună reală nu e atinsă.

    npm run proba:scriere
    npm run proba:scriere -- --chiar
*/

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const chiar = process.argv.includes("--chiar");

const id = process.env.BUGET_SHEET_ID;
if (!id) {
  console.error("Lipsește BUGET_SHEET_ID din .env.local.");
  process.exit(1);
}

const luna = lunaCurenta();

/* ------------------------------------------------------------ proba în gol */

console.log(`Citesc foaia „${luna}”…\n`);

const citit = await cereGoogle<{ values?: unknown[][] }>(
  `${SHEETS}/${id}/values/${encodeURIComponent(`${luna}!A1:Z600`)}?valueRenderOption=UNFORMATTED_VALUE`,
);

const asezare = citesteAsezarea(citit.values ?? []);

if (!asezare) {
  console.error("N-am găsit tabelul de tranzacții. Caut un rând cu Data | Categorie | Sumă.");
  process.exit(1);
}

console.log(`  antetul tranzacțiilor e pe rândul ${asezare.randAntet}`);
console.log(
  `  coloane: Data ${litere(asezare.coloanaData)}, ` +
    `Categorie ${litere(asezare.coloanaCategorie)}, ` +
    `Sumă ${litere(asezare.coloanaSuma)}, ` +
    `Descriere ${litere(asezare.coloanaDescriere)}`,
);
console.log(`  următoarea cheltuială ar intra pe rândul ${asezare.randUrmator}`);

const formule = await cereGoogle<{ values?: unknown[][] }>(
  `${SHEETS}/${id}/values/${encodeURIComponent(`${luna}!D1:D60`)}?valueRenderOption=FORMULA`,
);
const avertisment = verificaIntervalul(formule.values ?? [], asezare.randUrmator, [
  litere(asezare.coloanaData),
  litere(asezare.coloanaCategorie),
  litere(asezare.coloanaSuma),
  litere(asezare.coloanaDescriere),
]);
console.log(`  intervalul formulelor: ${avertisment ? "PREA SCURT — " + avertisment : "în regulă"}`);

if (!chiar) {
  console.log("\nProbă în gol, n-am scris nimic.");
  console.log("Pentru drumul întreg, pe o filă de unică folosință care se șterge la final:");
  console.log("  npm run proba:scriere -- --chiar");
  process.exit(0);
}

/* --------------------------------------------------- drumul întreg, pe o filă de probă */

const NUME_PROBA = "PROBĂ-2099-01";
console.log(`\nFac fila „${NUME_PROBA}” din „Șablon Lunar”…`);

const meta = await cereGoogle<{ sheets?: { properties: { sheetId: number; title: string } }[] }>(
  `${SHEETS}/${id}?fields=sheets.properties(sheetId,title)`,
);
const foi = meta.sheets ?? [];

// Dacă a rămas din altă rulare, o luăm de la capăt.
const veche = foi.find((f) => f.properties.title === NUME_PROBA);
if (veche) {
  await sterge(veche.properties.sheetId);
  console.log("  (am șters o filă de probă rămasă dinainte)");
}

const sablon = foi.find((f) => f.properties.title === "Șablon Lunar");
if (!sablon) {
  console.error("Nu găsesc „Șablon Lunar”.");
  process.exit(1);
}

const dupaDuplicare = await cereGoogle<{
  replies?: { duplicateSheet?: { properties: { sheetId: number } } }[];
}>(`${SHEETS}/${id}:batchUpdate`, {
  method: "POST",
  body: JSON.stringify({
    requests: [
      { duplicateSheet: { sourceSheetId: sablon.properties.sheetId, newSheetName: NUME_PROBA } },
    ],
  }),
});

const idProba = dupaDuplicare.replies?.[0]?.duplicateSheet?.properties.sheetId;
if (idProba == null) {
  console.error("Nu am primit înapoi id-ul filei de probă.");
  process.exit(1);
}

try {
  const { scrieTranzactii } = await import("../lib/servicii/foaie-buget.ts");

  console.log("Scriu două cheltuieli…");
  const primul = await scrieTranzactii(NUME_PROBA, [
    { data: "2099-01-05", categorie: "Mâncare", suma: 123.45, descriere: "probă" },
    { data: "2099-01-05", categorie: "Curatenie", suma: 30.55, descriere: "probă" },
  ]);
  console.log(`  rândurile ${primul.primulRand}–${primul.primulRand + primul.cate - 1}`);

  console.log("Mai scriu una, ca să văd că se adaugă la coadă…");
  const doilea = await scrieTranzactii(NUME_PROBA, [
    { data: "2099-01-06", categorie: "Mâncare", suma: 10, descriere: null },
  ]);
  console.log(`  rândul ${doilea.primulRand}`);

  const verificare = await cereGoogle<{ values?: unknown[][] }>(
    `${SHEETS}/${id}/values/${encodeURIComponent(`${NUME_PROBA}!A1:F60`)}?valueRenderOption=UNFORMATTED_VALUE`,
  );

  const randuri = verificare.values ?? [];
  const real = (categorie: string) =>
    Number(randuri.find((r) => String(r?.[0] ?? "").trim() === categorie)?.[3] ?? NaN);

  const mancare = real("Mâncare");
  const curatenie = real("Curatenie");

  console.log(`\n  „Real (Local)” Mâncare:   ${mancare} (aștept 133.45)`);
  console.log(`  „Real (Local)” Curatenie: ${curatenie} (aștept 30.55)`);

  const bine = Math.abs(mancare - 133.45) < 0.001 && Math.abs(curatenie - 30.55) < 0.001;
  console.log(
    bine
      ? "\nFormulele au prins sumele. Scrierea în buget merge cap-coadă."
      : "\nSumele n-au ajuns în „Real (Local)”. Verifică intervalele din formule.",
  );
  process.exitCode = bine ? 0 : 1;
} finally {
  await sterge(idProba);
  console.log(`Am șters fila „${NUME_PROBA}”.`);
}

async function sterge(sheetId: number) {
  await cereGoogle(`${SHEETS}/${id}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ deleteSheet: { sheetId } }] }),
  });
}
