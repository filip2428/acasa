import "server-only";

import { azi as ziuaDeAzi, adaugaLuni, lunaCurenta, lunaVecina, zileIntre } from "@/lib/formatare";

import { scrieTranzactii, asiguraFoaiaLunii } from "./foaie-buget";
import { cereGoogle } from "./google";
import {
  areScadenta,
  citesteEconomii,
  citesteLuna,
  citesteTinte,
  conturiFaraFond,
  contPentruScop,
  conversie,
  costDeBaza,
  costDupaRetragere,
  dobandaNeta,
  dinEconomii,
  esteInvestitie,
  etichetaCont,
  fonduri,
  fonduriDinLuna,
  FOND_URGENTA,
  GUILT_FREE,
  INVESTITII,
  numar,
  produsDupaPrelungire,
  r2,
  scopDinFinantare,
  sumarLuna,
  surseDinEconomii,
  ziCuPuncte,
  ziDinFoaie,
  ZECIUIALA,
  type Cont,
  type Economii,
  type Luna,
  type Persoana,
} from "./model-buget";

/*
  Economiile, fondurile și venitul ocazional — citite din foaie și scrise înapoi.

  Fiecare operație face la fel ca meniurile din foaie („💰 Economii”, „🏠 Buget”):
  recitește tot, verifică tot, abia apoi scrie. Așa o operație refuzată nu lasă
  nimic pe jumătate. Socotelile sunt în `model-buget.ts` (pure, cu probe).
*/

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const ECONOMII = "Economii";
const MISCARI = "Economii_Mișcări";
const JURNAL = "Venituri ocazionale";
const ANTET_MISCARI = ["Data", "Tip", "Din", "În", "Sumă", "Monedă", "Sumă primită", "Monedă primită", "Notă"];
const ANTET_JURNAL = ["Data", "Luna", "Sursă", "Descriere", "Sumă", "Zeciuială", "Investitii",
  "Fond", "Sumă fond", "Guilt free Filip", "Guilt free Ralu", "Notă", "Pentru"];

function idFoaie() {
  const id = process.env.BUGET_SHEET_ID;
  if (!id) throw new Error("Lipsește BUGET_SHEET_ID.");
  return id;
}

const interval = (foaie: string, a1: string) => `'${foaie.replace(/'/g, "''")}'!${a1}`;

async function titluriFoi() {
  const r = await cereGoogle<{ sheets?: { properties: { title: string } }[] }>(
    `${SHEETS}/${idFoaie()}?fields=sheets.properties.title`,
  );
  return (r.sheets ?? []).map((s) => s.properties.title);
}

async function citeste(intervale: string[]) {
  if (!intervale.length) return [];
  const q = intervale.map((i) => `ranges=${encodeURIComponent(i)}`).join("&");
  const r = await cereGoogle<{ valueRanges?: { values?: unknown[][] }[] }>(
    `${SHEETS}/${idFoaie()}/values:batchGet?${q}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
  );
  return (r.valueRanges ?? []).map((v) => v.values ?? []);
}

type Scriere = { range: string; values: unknown[][] };

async function scrie(date: Scriere[]) {
  if (!date.length) return;
  await cereGoogle(`${SHEETS}/${idFoaie()}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: date }),
  });
}

/** Adaugă rânduri la coada unei foi; o creează (cu antet) dacă lipsește. */
async function adaugaLaCoada(foaie: string, antet: string[], randuri: unknown[][]) {
  if (!randuri.length) return;
  const trimite = () =>
    cereGoogle(
      `${SHEETS}/${idFoaie()}/values/${encodeURIComponent(interval(foaie, "A1"))}:append` +
        "?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
      { method: "POST", body: JSON.stringify({ values: randuri }) },
    );
  const exista = (await titluriFoi()).includes(foaie);
  if (!exista) {
    await cereGoogle(`${SHEETS}/${idFoaie()}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: foaie } } }] }),
    });
    await scrie([{ range: interval(foaie, "A1"), values: [antet] }]);
  }
  await trimite();
}

const miscare = (tip: string, din: string, inCont: string, suma: number, moneda: string,
  primit: number | "" = "", monedaPrimita = "", nota = "") =>
  [ziuaDeAzi(), tip, din, inCont, r2(suma), moneda, primit === "" ? "" : r2(primit), monedaPrimita, nota];

/** Scrierile pentru „soldul contului += delta”: F, Q și (la investiții) costul O. */
function sold(c: Cont, delta: number, permiteMinus = false): Scriere[] {
  const nou = r2(c.sold + delta);
  if (nou < -0.005 && !permiteMinus) {
    throw new Error(`„${etichetaCont(c)}” ar ajunge pe minus (sold ${c.sold.toFixed(2)} ${c.moneda}).`);
  }
  const s: Scriere[] = [
    { range: interval(ECONOMII, `F${c.rand}`), values: [[nou]] },
    { range: interval(ECONOMII, `Q${c.rand}`), values: [[ziuaDeAzi()]] },
  ];
  if (esteInvestitie(c)) {
    const depus = delta > 0 ? r2(c.depus + delta) : costDupaRetragere(c.depus, c.sold, -delta);
    s.push({ range: interval(ECONOMII, `O${c.rand}`), values: [[depus]] });
  }
  // Ca mai multe mișcări pe același cont în aceeași operație să se adune corect.
  c.sold = nou;
  if (esteInvestitie(c) && delta > 0) c.depus = r2(c.depus + delta);
  return s;
}

/* ================================================================== citire */

export type Rata = { denumire: string; rata: number; ramase: number | null; ultima: string | null; rest: number | null };

export type StareEconomii = {
  luna: string;
  model: Luna;
  sumar: ReturnType<typeof sumarLuna>;
  economii: Economii;
  fonduri: ReturnType<typeof fonduri>;
  faraFond: Cont[];
  cost: ReturnType<typeof costDeBaza>;
  urgenta: { sold: number; luni: number | null; tinta: number | null; luniTinta: number };
  rate: Rata[];
  scadente: (Cont & { zile: number })[];
  surse: string[];
  total: number;
};

function citesteRate(grila: unknown[][]): Rata[] {
  const antet = grila.findIndex((r) => String(r?.[0] ?? "").trim() === "Denumire");
  if (antet < 0) return [];
  return grila.slice(antet + 1)
    .filter((r) => String(r?.[0] ?? "").trim() && String(r?.[0]).trim() !== "TOTAL")
    .map((r) => ({
      denumire: String(r[0]).trim(),
      rata: numar(r[1]),
      ramase: typeof r[4] === "number" ? r[4] : null,
      ultima: ziDinFoaie(r[5]),
      rest: typeof r[6] === "number" ? r[6] : null,
    }));
}

/** Tot ce trebuie ecranelor de bani: luna, conturile, fondurile, fondul de urgență. */
export async function stareaEconomiilor(): Promise<StareEconomii> {
  const luna = lunaCurenta();
  const foi = new Set(await titluriFoi());
  if (!foi.has(luna)) await asiguraFoaiaLunii(luna);
  const anterioare = [1, 2, 3].map((n) => lunaVecina(luna, -n)).filter((m) => foi.has(m));

  const [grilaLuna, grilaEconomii, grilaFonduri, grilaRate, ...grileAnterioare] = await citeste([
    interval(luna, "A1:L400"),
    interval(ECONOMII, "A1:R42"),
    ...(foi.has("Fonduri") ? [interval("Fonduri", "A1:F60")] : ["Dashboard!A1:A1"]),
    ...(foi.has("Rate") ? [interval("Rate", "A1:H20")] : ["Dashboard!A1:A1"]),
    ...anterioare.map((m) => interval(m, "A1:F80")),
  ]);

  const model = citesteLuna(grilaLuna);
  const economii = citesteEconomii(grilaEconomii);
  const cost = costDeBaza(grileAnterioare.map(citesteLuna));
  const luniTinta = economii.luniTinta || 6;
  const tintaUrgenta = cost ? r2(cost.cuTampon * luniTinta) : null;
  const fd = fonduri(model, economii, citesteTinte(grilaFonduri), ziuaDeAzi(), tintaUrgenta);
  const urgenta = fd.find((f) => f.nume === FOND_URGENTA);
  const soldUrgenta = urgenta?.inConturi ?? 0;
  const azi = ziuaDeAzi();

  return {
    luna,
    model,
    sumar: sumarLuna(model),
    economii,
    fonduri: fd,
    faraFond: conturiFaraFond(economii, fonduriDinLuna(model)),
    cost,
    urgenta: {
      sold: soldUrgenta,
      luni: cost && cost.cuTampon > 0 ? soldUrgenta / cost.cuTampon : null,
      tinta: tintaUrgenta,
      luniTinta,
    },
    rate: citesteRate(grilaRate),
    scadente: economii.conturi
      .filter((c) => areScadenta(c) && c.sold > 0 && c.scadenta)
      .map((c) => ({ ...c, zile: zileIntre(azi, c.scadenta!) }))
      .sort((a, b) => a.zile - b.zile),
    surse: surseDinEconomii(model),
    total: r2(economii.conturi.reduce((t, c) => t + c.soldLei, 0)),
  };
}

/* ================================================================== operații */

async function proaspat() {
  const luna = lunaCurenta();
  if (!(await titluriFoi()).includes(luna)) await asiguraFoaiaLunii(luna);
  const [grilaLuna, grilaEconomii] = await citeste([interval(luna, "A1:L400"), interval(ECONOMII, "A1:R42")]);
  return { luna, model: citesteLuna(grilaLuna), economii: citesteEconomii(grilaEconomii) };
}

function cont(economii: Economii, rand: number | string | null | undefined) {
  const c = economii.conturi.find((x) => x.rand === Number(rand));
  if (!c) throw new Error("Contul ales nu mai există în foaia Economii. Reîmprospătează.");
  return c;
}

function verificaCategorii(model: Luna, luna: string, categorii: string[]) {
  const are = new Set(model.categorii.map((c) => c.nume));
  const lipsa = [...new Set(categorii)].filter((c) => !are.has(c));
  if (lipsa.length) throw new Error(`Luna ${luna} n-are în tabel: ${lipsa.join(", ")}. Nu am scris nimic.`);
}

/** 💸 Transferurile lunii: planul de Fond/Avere ajunge în conturi și în buget. */
export async function transferaLuna(
  randuri: { categorie: string; suma: number; cont: number | null; primit?: number | null }[],
  sursa: number | null,
) {
  const { luna, model, economii } = await proaspat();
  const valide = randuri.filter((r) => r2(r.suma) > 0);
  if (!valide.length) throw new Error("N-ai ales nimic cu sumă mai mare ca zero.");
  verificaCategorii(model, luna, valide.map((r) => r.categorie));

  const src = sursa != null ? cont(economii, sursa) : null;
  if (src && src.moneda !== "RON") throw new Error("Transferurile lunii pleacă dintr-un cont în lei.");
  const scrieri: Scriere[] = [], tx = [], log: unknown[][] = [], facute: string[] = [];
  for (const r of valide) {
    const suma = r2(r.suma);
    if (src) scrieri.push(...sold(src, -suma));
    const dest = r.cont != null ? cont(economii, r.cont) : null;
    let primit: number | "" = "";
    if (dest) {
      primit = dest.moneda === "RON" ? suma : r2(r.primit || conversie(suma, 1, dest.curs));
      scrieri.push(...sold(dest, primit));
    }
    tx.push({ data: ziuaDeAzi(), categorie: r.categorie, suma, descriere: dest ? `Transfer → ${etichetaCont(dest)}` : "Transfer", finantare: "" });
    log.push(miscare("Transfer lunar", src ? etichetaCont(src) : "Venitul lunii", dest ? etichetaCont(dest) : "(fără cont)",
      suma, "RON", primit, dest?.moneda ?? "", r.categorie));
    facute.push(`${r.categorie} ${suma.toFixed(2)} lei`);
  }
  await scrieTranzactii(luna, tx);
  await scrie(scrieri);
  await adaugaLaCoada(MISCARI, ANTET_MISCARI, log);
  return `${facute.length === 1 ? "Un transfer notat" : `${facute.length} transferuri notate`}: ${facute.join(", ")}.`;
}

/** 🔄 Mută bani între conturi, și în altă monedă. */
export async function mutaBani(d: { din: number; spre: number; suma: number; primit?: number | null; nota?: string }) {
  const { economii } = await proaspat();
  if (d.din === d.spre) throw new Error("Alege două conturi diferite.");
  const din = cont(economii, d.din), spre = cont(economii, d.spre);
  const suma = r2(d.suma);
  if (!(suma > 0)) throw new Error("Suma trebuie să fie mai mare ca zero.");
  const primit = din.moneda === spre.moneda ? suma : r2(d.primit || conversie(suma, din.curs, spre.curs));
  if (!(primit > 0)) throw new Error("Suma primită trebuie să fie mai mare ca zero.");
  const scrieri = [...sold(din, -suma), ...sold(spre, primit)];
  const curs = din.moneda !== spre.moneda ? ` · curs ${(suma / primit).toFixed(4)}` : "";
  await scrie(scrieri);
  await adaugaLaCoada(MISCARI, ANTET_MISCARI, [miscare("Transfer", etichetaCont(din), etichetaCont(spre), suma, din.moneda,
    primit, spre.moneda, (d.nota ?? "").trim() + curs)]);
  return `${suma.toFixed(2)} ${din.moneda} mutați în „${etichetaCont(spre)}”` +
    (din.moneda !== spre.moneda ? ` (${primit.toFixed(2)} ${spre.moneda})` : "") + ".";
}

/** 🏦 Deschide cont de economii / depozit / titluri de stat. */
export async function deschideCont(d: {
  tip: string; institutie: string; produs?: string; moneda: string; suma: number; sursa: number | null;
  dobanda: number; luni?: number | null; data: string; scop: string; titular: string;
}) {
  const { luna, model, economii } = await proaspat();
  const cuScadenta = d.tip === "Depozit" || d.tip === "Titluri de stat";
  const suma = r2(d.suma), rata = (Number(d.dobanda) || 0) / 100, luni = Math.round(Number(d.luni) || 0);
  if (cuScadenta ? !(suma > 0) : !(suma >= 0)) throw new Error(cuScadenta ? "Suma trebuie să fie mai mare ca zero." : "Suma nu poate fi negativă.");
  if (cuScadenta && !(luni >= 1 && luni <= 120)) throw new Error("Termenul e în luni, între 1 și 120.");
  if (!(rata >= 0 && rata < 1)) throw new Error("Dobânda e în procente, ex: 6,5.");
  if (!d.institutie.trim()) throw new Error("Scrie banca.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) throw new Error("Data nu e bună.");
  const rand = economii.randuriLibere[0];
  if (!rand) throw new Error("Nu mai e niciun rând liber în tabelul de conturi (13–42).");

  const src = d.sursa != null && suma > 0 ? cont(economii, d.sursa) : null;
  const moneda = src ? src.moneda : d.moneda || "RON";
  const scadenta = cuScadenta ? adaugaLuni(d.data, luni) : null;
  const produs = d.produs?.trim() || (cuScadenta ? `${d.tip === "Depozit" ? "Depozit" : "Titluri de stat"} ${luni} luni` : "cont de economii");
  const nota = cuScadenta ? `constituit ${ziCuPuncte(d.data)} · ${luni} luni` : `deschis ${ziCuPuncte(d.data)}`;

  // Bani noi din venit pe un fond din buget → intră și în luna lor (doar luna curentă).
  const inBuget = !src && suma > 0 && moneda === "RON" && d.data.slice(0, 7) === luna &&
    fonduriDinLuna(model).some((f) => f.nume === d.scop);

  const scrieri: Scriere[] = [
    ...(src ? sold(src, -suma) : []),
    { range: interval(ECONOMII, `A${rand}:F${rand}`), values: [[d.institutie.trim(), produs, d.tip, d.titular, moneda, suma]] },
    { range: interval(ECONOMII, `I${rand}`), values: [[rata]] },
    { range: interval(ECONOMII, `K${rand}:L${rand}`), values: [[cuScadenta ? "La scadență" : "Imediat", scadenta ?? ""]] },
    { range: interval(ECONOMII, `N${rand}`), values: [[d.scop]] },
    { range: interval(ECONOMII, `Q${rand}:R${rand}`), values: [[ziuaDeAzi(), nota]] },
  ];
  if (inBuget) await scrieTranzactii(luna, [{ data: d.data, categorie: d.scop, suma, descriere: `${d.tip} nou · ${d.institutie.trim()}`, finantare: "" }]);
  await scrie(scrieri);
  await adaugaLaCoada(MISCARI, ANTET_MISCARI, [miscare(d.tip === "Cont de economii" ? "Cont nou" : `${d.tip} nou`,
    src ? etichetaCont(src) : suma > 0 ? "Venitul lunii" : "", `${d.institutie.trim()} · ${produs} · ${moneda}`, suma, moneda,
    "", "", `${(rata * 100).toFixed(2)}%${scadenta ? ` · scadență ${ziCuPuncte(scadenta)}` : ""} · ${d.scop}`)]);

  if (!cuScadenta) return `Cont nou: ${d.institutie.trim()} · ${produs}, pentru „${d.scop}”.` + (inBuget ? ` ${suma.toFixed(2)} lei trecuți și în buget.` : "");
  const net = dobandaNeta(suma, rata, zileIntre(d.data, scadenta!), d.tip === "Titluri de stat", economii.impozit);
  return `${d.tip} ${suma.toFixed(2)} ${moneda}, ${luni} luni, scadență ${ziCuPuncte(scadenta!)}. Dobândă estimată ${net.toFixed(2)} ${moneda} net.`;
}

/** ⏰ Depozit la scadență: prelungește (cu sau fără dobânda) sau lichidează. */
export async function scadenta(d: {
  rand: number; dobanda: number; actiune: "prelungeste" | "lichideaza"; rataNoua?: number; luni?: number;
  capitalizeaza?: boolean; contDobanda?: number | null; contLichidare?: number | null;
}) {
  const { economii } = await proaspat();
  const dep = cont(economii, d.rand);
  if (!areScadenta(dep)) throw new Error("Contul ales nu e depozit sau titlu de stat.");
  const dobanda = Math.max(0, r2(d.dobanda));
  const et = etichetaCont(dep);

  if (d.actiune === "prelungeste") {
    const luni = Math.round(Number(d.luni) || 0), rata = (Number(d.rataNoua) || 0) / 100;
    if (!(luni >= 1 && luni <= 120)) throw new Error("Termenul e în luni, între 1 și 120.");
    const start = dep.scadenta ?? ziuaDeAzi();
    const noua = adaugaLuni(start, luni);
    const scrieri: Scriere[] = [], log: unknown[][] = [];
    if (dobanda > 0) {
      if (d.capitalizeaza) {
        scrieri.push(...sold(dep, dobanda));
        log.push(miscare("Dobândă capitalizată", et, et, dobanda, dep.moneda));
      } else {
        const dest = cont(economii, d.contDobanda);
        if (dest.moneda !== dep.moneda) throw new Error("Dobânda merge într-un cont în aceeași monedă.");
        scrieri.push(...sold(dest, dobanda));
        log.push(miscare("Dobândă încasată", et, etichetaCont(dest), dobanda, dep.moneda));
      }
    }
    scrieri.push(
      { range: interval(ECONOMII, `B${dep.rand}`), values: [[produsDupaPrelungire(dep.produs, luni)]] },
      { range: interval(ECONOMII, `I${dep.rand}`), values: [[rata]] },
      { range: interval(ECONOMII, `L${dep.rand}`), values: [[noua]] },
      { range: interval(ECONOMII, `Q${dep.rand}:R${dep.rand}`), values: [[ziuaDeAzi(), `constituit ${ziCuPuncte(start)} · ${luni} luni`]] },
    );
    log.push(miscare("Depozit prelungit", et, et, dep.sold, dep.moneda, "", "", `${(rata * 100).toFixed(2)}% · ${luni} luni · scadență ${ziCuPuncte(noua)}`));
    await scrie(scrieri);
    await adaugaLaCoada(MISCARI, ANTET_MISCARI, log);
    return `Prelungit ${luni} luni la ${(rata * 100).toFixed(2)}%, scadență ${ziCuPuncte(noua)}.`;
  }

  const dest = cont(economii, d.contLichidare);
  if (dest.moneda !== dep.moneda) throw new Error("Lichidarea merge într-un cont în aceeași monedă.");
  const total = r2(dep.sold + dobanda);
  await scrie([...sold(dest, total), ...golesteRand(dep.rand)]);
  await adaugaLaCoada(MISCARI, ANTET_MISCARI, [miscare("Depozit lichidat", et, etichetaCont(dest), total, dep.moneda, "", "", `din care dobândă ${dobanda.toFixed(2)}`)]);
  return `${total.toFixed(2)} ${dep.moneda} au intrat în „${etichetaCont(dest)}”.`;
}

/** Coloanele de completat ale unui rând din Economii; formulele rămân. */
function golesteRand(rand: number): Scriere[] {
  return ["A", "B", "C", "D", "E", "F", "I", "K", "L", "N", "O", "Q", "R"].map((col) => ({
    range: interval(ECONOMII, `${col}${rand}`), values: [[""]],
  }));
}

/** 📝 Actualizează soldurile — doar ce s-a schimbat; diferența rămâne în istoric. */
export async function actualizeazaSolduri(lista: { rand: number; sold: number }[]) {
  const { economii } = await proaspat();
  const scrieri: Scriere[] = [], log: unknown[][] = [];
  for (const x of lista) {
    const c = cont(economii, x.rand);
    const nou = r2(x.sold);
    if (!(nou >= 0)) throw new Error(`Sold invalid la „${etichetaCont(c)}”.`);
    if (Math.abs(nou - c.sold) < 0.005) continue;
    scrieri.push({ range: interval(ECONOMII, `F${c.rand}`), values: [[nou]] }, { range: interval(ECONOMII, `Q${c.rand}`), values: [[ziuaDeAzi()]] });
    log.push(miscare("Ajustare sold", "", etichetaCont(c), r2(nou - c.sold), c.moneda, "", "", `actualizare: ${c.sold.toFixed(2)} → ${nou.toFixed(2)}`));
  }
  await scrie(scrieri);
  await adaugaLaCoada(MISCARI, ANTET_MISCARI, log);
  return log.length ? `${log.length === 1 ? "Un sold actualizat" : `${log.length} solduri actualizate`}.` : "Nimic de schimbat.";
}

/** 🗑 Închide cont / vinde investiție: banii merg în alt cont sau ies din economii. */
export async function inchideCont(d: { rand: number; destinatie: number | "afara"; primit?: number | null; dobanda?: number; nota?: string }) {
  const { economii } = await proaspat();
  const c = cont(economii, d.rand);
  const et = etichetaCont(c);
  const total = r2(c.sold + (areScadenta(c) ? Math.max(0, Number(d.dobanda) || 0) : 0));
  const scrieri: Scriere[] = [];
  let unde = "(gol)", primit: number | "" = "", monedaPrimita = "";
  if (total > 0.005) {
    if (d.destinatie === "afara") unde = "(retras din economii)";
    else {
      if (Number(d.destinatie) === c.rand) throw new Error("Alege alt cont decât cel pe care îl închizi.");
      const dest = cont(economii, d.destinatie);
      primit = dest.moneda === c.moneda ? total : r2(d.primit || conversie(total, c.curs, dest.curs));
      scrieri.push(...sold(dest, primit));
      unde = etichetaCont(dest); monedaPrimita = dest.moneda;
    }
  }
  const castig = esteInvestitie(c) && c.depus > 0 ? r2(c.sold - c.depus) : null;
  scrieri.push(...golesteRand(c.rand));
  await scrie(scrieri);
  await adaugaLaCoada(MISCARI, ANTET_MISCARI, [miscare(esteInvestitie(c) ? "Investiție vândută" : "Cont închis", et, unde, total, c.moneda,
    primit, monedaPrimita, [castig != null ? `câștig realizat ${castig >= 0 ? "+" : ""}${castig.toFixed(2)} ${c.moneda}` : "", d.nota ?? ""].filter(Boolean).join(" · "))]);
  return `„${et}” e închis.` + (castig != null ? ` Câștig realizat: ${castig >= 0 ? "+" : ""}${castig.toFixed(2)} ${c.moneda}.` : "");
}

/** 💸 Plătește din economii: în tranzacțiile lunii cu „Din …”, iar contul scade. */
export async function platesteDinEconomii(d: {
  data: string; categorie: string; suma: number; descriere: string; finantare: string; cont: number | null;
}) {
  const { economii } = await proaspat();
  const luna = d.data.slice(0, 7);
  const suma = r2(d.suma);
  if (!(suma > 0)) throw new Error("Suma trebuie să fie mai mare ca zero.");
  if (!dinEconomii(d.finantare)) throw new Error("Alege din ce economii plătești.");
  const c = d.cont != null ? cont(economii, d.cont) : null;
  const inMoneda = c ? (c.moneda === "RON" ? suma : conversie(suma, 1, c.curs)) : 0;
  const scrieri = c ? sold(c, -inMoneda) : [];       // verifică soldul înainte de orice scriere
  await scrieTranzactii(luna, [{ data: d.data, categorie: d.categorie, suma, descriere: d.descriere, finantare: d.finantare }]);
  if (c) {
    await scrie(scrieri);
    await adaugaLaCoada(MISCARI, ANTET_MISCARI, [miscare("Plată din economii", etichetaCont(c), d.categorie, inMoneda, c.moneda, "", "", d.descriere)]);
  }
  return `${suma.toFixed(2)} lei pe „${d.categorie}”, ${d.finantare.toLowerCase()}.` + (c ? ` Contul „${etichetaCont(c)}” a scăzut.` : "");
}

/** Ținta și termenul unui fond, în foaia Fonduri (coloanele E și F). */
export async function seteazaTinta(nume: string, tinta: number | null, panaLa: string | null) {
  if (!(await titluriFoi()).includes("Fonduri")) {
    throw new Error("Foaia Fonduri lipsește. Rulează o dată în foaie 🏠 Buget → 🧭 Recalculează Fonduri.");
  }
  const [grila] = await citeste([interval("Fonduri", "A1:A60")]);
  const i = grila.findIndex((r) => String(r?.[0] ?? "").trim() === nume);
  if (i < 0) throw new Error(`Fondul „${nume}” nu e în foaia Fonduri. Rulează în foaie 🧭 Recalculează Fonduri.`);
  if (tinta != null && !(tinta >= 0)) throw new Error("Ținta trebuie să fie o sumă pozitivă.");
  if (panaLa && !/^\d{4}-\d{2}-\d{2}$/.test(panaLa)) throw new Error("Data nu e bună.");
  await scrie([{ range: interval("Fonduri", `E${i + 1}:F${i + 1}`), values: [[tinta ?? "", panaLa ?? ""]] }]);
  return tinta ? `Ținta pentru „${nume}”: ${tinta.toFixed(2)} lei${panaLa ? ` până la ${ziCuPuncte(panaLa)}` : ""}.` : `Ținta pentru „${nume}” a fost scoasă.`;
}

/** Contul implicit pentru o sursă „Din …”. */
export function contImplicit(conturi: Cont[], finantare: string) {
  const scop = scopDinFinantare(finantare);
  return scop ? contPentruScop(conturi, scop) : null;
}

/** 💵 Încasează venit ocazional. */
export async function venitOcazional(d: {
  data: string; suma: number; sursa: string; descriere: string; pentru: Persoana; zeciuiala: boolean;
  investitii: number; fond: string; sumaFond: number; guiltFreeFilip: number; guiltFreeRalu: number; mutaAcum: boolean;
}) {
  const luna = d.data.slice(0, 7);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) throw new Error("Data nu e bună.");
  if (luna !== lunaCurenta()) throw new Error("Venitul ocazional se trece în luna curentă.");
  const { model, economii } = await proaspat();
  const suma = r2(d.suma);
  if (!(suma > 0)) throw new Error("Suma trebuie să fie mai mare ca zero.");
  const zeciuiala = d.zeciuiala ? r2(suma * 0.1) : 0;
  const parti = { inv: r2(d.investitii), fond: r2(d.sumaFond), gfF: r2(d.guiltFreeFilip), gfR: r2(d.guiltFreeRalu) };
  if (Object.values(parti).some((x) => x < 0)) throw new Error("Sumele nu pot fi negative.");
  const nealocat = r2(suma - zeciuiala - parti.inv - parti.fond - parti.gfF - parti.gfR);
  if (Math.abs(nealocat) > 0.009) throw new Error(`Împărțirea nu iese: rămân ${nealocat.toFixed(2)} lei nealocați.`);
  if (parti.fond > 0 && !d.fond) throw new Error("Alege fondul.");

  const descriere = d.descriere.trim() || d.sursa;
  const eticheta = d.pentru === "Comun" ? `[Ocazional] ${descriere}` : `[Ocazional · ${d.pentru}] ${descriere}`;
  const categorii = [
    [ZECIUIALA, zeciuiala], [INVESTITII, parti.inv], [d.fond, parti.fond], [GUILT_FREE.Filip, parti.gfF], [GUILT_FREE.Ralu, parti.gfR],
  ].filter(([, x]) => (x as number) > 0).map(([c]) => c as string);
  verificaCategorii(model, luna, categorii);

  // Zeciuiala și Guilt free: se dau / se împart acum.
  const tx = [
    ...(zeciuiala > 0 ? [{ data: d.data, categorie: ZECIUIALA, suma: zeciuiala, descriere: eticheta, finantare: "" }] : []),
    ...(parti.gfF > 0 ? [{ data: d.data, categorie: GUILT_FREE.Filip, suma: parti.gfF, descriere: eticheta, finantare: "" }] : []),
    ...(parti.gfR > 0 ? [{ data: d.data, categorie: GUILT_FREE.Ralu, suma: parti.gfR, descriere: eticheta, finantare: "" }] : []),
  ];
  // Investitii + fondul: în buget doar dacă ajung acum în cont; altfel rămân „De mutat”.
  const scrieri: Scriere[] = [], log: unknown[][] = [], mutate: string[] = [], deMutat: string[] = [];
  for (const [cat, x] of [[INVESTITII, parti.inv], [d.fond, parti.fond]] as [string, number][]) {
    if (!(x > 0)) continue;
    const dest = d.mutaAcum ? contPentruScop(economii.conturi, cat) : null;
    if (!dest) { deMutat.push(`${cat} ${x.toFixed(2)}`); continue; }
    const primit = dest.moneda === "RON" ? x : conversie(x, 1, dest.curs);
    scrieri.push(...sold(dest, primit));
    log.push(miscare("Transfer lunar", "Venit ocazional", etichetaCont(dest), x, "RON", primit, dest.moneda, `${cat} · ${descriere}`));
    tx.push({ data: d.data, categorie: cat, suma: x, descriere: `${eticheta} → ${etichetaCont(dest)}`, finantare: "" });
    mutate.push(`${cat} → ${etichetaCont(dest)}`);
  }
  // Planul crește cu ce s-a alocat (zeciuiala are formulă și se ajustează singură).
  for (const [cat, x] of [[INVESTITII, parti.inv], [d.fond, parti.fond], [GUILT_FREE.Filip, parti.gfF], [GUILT_FREE.Ralu, parti.gfR]] as [string, number][]) {
    const rand = model.categorii.find((c) => c.nume === cat);
    if (x > 0 && rand) { scrieri.push({ range: interval(luna, `C${rand.rand}`), values: [[r2(rand.plan + x)]] }); rand.plan = r2(rand.plan + x); }
  }

  await adaugaLaCoada(JURNAL, ANTET_JURNAL, [[d.data, `'${luna}`, d.sursa, descriere, suma, zeciuiala, parti.inv,
    parti.fond > 0 ? d.fond : "", parti.fond, parti.gfF, parti.gfR, `din aplicație, ${ziCuPuncte(ziuaDeAzi())}`, d.pentru]]);
  if (tx.length) await scrieTranzactii(luna, tx);
  await scrie(scrieri);
  await adaugaLaCoada(MISCARI, ANTET_MISCARI, log);

  return `${suma.toFixed(2)} lei înregistrați.` + (zeciuiala > 0 ? ` Zeciuială ${zeciuiala.toFixed(2)}.` : "") +
    (mutate.length ? ` Mutat: ${mutate.join("; ")}.` : "") + (deMutat.length ? ` De mutat: ${deMutat.join("; ")}.` : "");
}

