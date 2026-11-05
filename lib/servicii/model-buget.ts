/*
  Structura foii Buget_Familial (v2) și socotelile peste ea.

  Fără „server-only” și fără rețea: sunt funcții pure, verificate în
  `scripturi/proba-economii.mts` pe replici ale foii adevărate. Tot ce citește sau
  scrie în Google stă în `economii.ts`.

  Foaia e sursa de adevăr. Aceeași logică există și în scripturile Apps Script
  ale foii (meniurile „🏠 Buget” și „💰 Economii”); aici o refacem ca aplicația
  să poată face pe telefon tot ce se face din meniuri, fără să scrie altfel.

  Pe scurt, ce e în foaie:
  - foile lunare „AAAA-LL”: venituri, tabelul „Categorie | Tip | Planificat |
    Real (Local)” și tranzacțiile în H–L („… | Descriere | Finanțat din”);
  - „Economii”: conturile, pe rândurile 13–42;
  - „Fonduri”: ținta și termenul fiecărui fond (restul se calculează);
  - „Venituri ocazionale”, „Economii_Mișcări”, „Rate”.
*/

/* --------------------------------------------------------------- constante */

export const GRUPE = [
  { tip: "Esențială", eticheta: "Esențiale", economie: false },
  { tip: "Dăruire", eticheta: "Dăruire", economie: false },
  { tip: "Rată", eticheta: "Rate", economie: false },
  { tip: "Flexibilă", eticheta: "Flexibile", economie: false },
  { tip: "Fond", eticheta: "Fonduri cu scop", economie: true },
  { tip: "Avere", eticheta: "Investiții + urgență", economie: true },
] as const;

export type TipGrupa = (typeof GRUPE)[number]["tip"];

/** „Din …” în coloana „Finanțat din” = plătit din economii, nu din venitul lunii. */
export const PREFIX_DIN = "Din ";
export const VENIT_LUNA = "Venit lună";
export const DIN_ECONOMII_GENERALE = "Din economii generale";
export const DIN_AJUTOR_FAMILIE = "Din ajutor familie";

export const ZECIUIALA = "Zeciuiala";
export const INVESTITII = "Investitii";
export const FOND_URGENTA = "Fond de urgență";
export const GUILT_FREE = { Filip: "Guilt free Filip", Ralu: "Guilt free Ralu" } as const;
export const PROCENT_ZECIUIALA = 0.1;

/** Rândurile de venit care contează ca ocazional (și cele din lunile dinainte de v2). */
export const VENITURI_OCAZIONALE = ["Venit ocazional", "Bonusuri", "Alt Venit"];

export const TIPURI_INVESTITII = ["Fond de investiții", "Broker / Acțiuni", "Crypto", "Pilon III"];
export const TIPURI_CU_SCADENTA = ["Depozit", "Titluri de stat"];
export const TIPURI_CONT_NOU = ["Cont de economii", "Depozit", "Titluri de stat"] as const;
export const TITULARI = ["Filip", "Ralu", "Comun"];
export const MONEDE = ["RON", "EUR", "USD", "GBP", "CHF"];
export const PERSOANE = ["Comun", "Filip", "Ralu"] as const;

/** Rândurile conturilor din foaia Economii. */
export const ECONOMII_PRIM = 13;
export const ECONOMII_ULTIM = 42;

/** Costul de bază pentru fondul de urgență: Esențiale + Rate, plus un tampon. */
export const TAMPON_BAZA = 0.25;
export const TIPURI_BAZA = ["Esențială", "Rată", "Necesară"];

/* ------------------------------------------------------------------ ajutoare */

const text = (v: unknown) => String(v ?? "").trim();

export function numar(v: unknown) {
  if (typeof v === "number") return v;
  const t = text(v).replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  // „1.240,50” (ro) sau „1,240.50” (en): ultimul separator e cel zecimal.
  const zecimal = Math.max(t.lastIndexOf(","), t.lastIndexOf("."));
  const curat = zecimal < 0 ? t : t.slice(0, zecimal).replace(/[.,]/g, "") + "." + t.slice(zecimal + 1);
  const n = Number(curat);
  return Number.isFinite(n) ? n : 0;
}

export const r2 = (x: number) => Math.round((Number(x) || 0) * 100) / 100;

/** Data din foaie (număr de serie Sheets sau text) → „AAAA-LL-ZZ”, sau null. */
export function ziDinFoaie(v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  const t = text(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** „AAAA-LL-ZZ” → „ZZ.LL.AAAA”, ca în notele din foaie. */
export function ziCuPuncte(zi: string) {
  return `${zi.slice(8, 10)}.${zi.slice(5, 7)}.${zi.slice(0, 4)}`;
}

/** Numărul coloanei în litere: 1 → A, 12 → L. */
export function litera(coloana: number) {
  let r = "";
  let n = coloana;
  while (n > 0) {
    r = String.fromCharCode(65 + ((n - 1) % 26)) + r;
    n = Math.floor((n - 1) / 26);
  }
  return r;
}

/** Primul rând liber al unui jurnal, din coloana lui A. Gol = încă n-are nici antet. */
export function randUrmatorInJurnal(coloanaA: unknown[][]) {
  let ultim = 0;
  coloanaA.forEach((r, i) => { if (text(r?.[0])) ultim = i + 1; });
  return ultim + 1;
}

/* ------------------------------------------------------------ foaia lunii */

export type RandVenit = { rand: number; nume: string; plan: number; real: number };
export type RandCategorie = { rand: number; nume: string; tip: string; plan: number; real: number };
export type Tranzactie = {
  rand: number;
  data: string | null;
  categorie: string;
  suma: number;
  descriere: string;
  finantare: string;
};

export type Luna = {
  venituri: RandVenit[];
  randTotalVenituri: number | null;
  categorii: RandCategorie[];
  /** Rândul cu antetul tranzacțiilor și coloana „Data” (numerotate de la 1). */
  antetTx: { rand: number; coloana: number; areFinantare: boolean } | null;
  tranzactii: Tranzactie[];
  /** Primul rând liber de sub ultima tranzacție. */
  randUrmator: number;
};

/** Citește o foaie lunară din valorile ei (A1 în colțul grilei, UNFORMATTED_VALUE). */
export function citesteLuna(grila: unknown[][]): Luna {
  const celula = (r: number, c: number) => grila[r]?.[c];
  let randSurse = -1, randTotalVenituri = -1, randAntetCat = -1, randTotalCat = -1;
  let antetTx: Luna["antetTx"] = null;

  for (let r = 0; r < grila.length; r++) {
    const a = text(celula(r, 0));
    if (a === "Sursă" && randSurse < 0) randSurse = r;
    if (a.includes("Total Venituri") && randTotalVenituri < 0) randTotalVenituri = r;
    if (a === "Categorie" && text(celula(r, 1)) === "Tip" && randAntetCat < 0) randAntetCat = r;
    if (a.includes("Total Cheltuieli") && randTotalCat < 0) randTotalCat = r;
    if (!antetTx) {
      const rand = grila[r] ?? [];
      const c = rand.findIndex((v, i) => i > 0 && text(v).toLowerCase() === "data" &&
        text(rand[i + 1]).toLowerCase() === "categorie" && text(rand[i + 2]).toLowerCase() === "sumă");
      if (c > 0) {
        antetTx = { rand: r + 1, coloana: c + 1, areFinantare: text(rand[c + 4]).toLowerCase() === "finanțat din" };
      }
    }
  }

  const venituri: RandVenit[] = [];
  if (randSurse >= 0 && randTotalVenituri > randSurse) {
    for (let r = randSurse + 1; r < randTotalVenituri; r++) {
      const nume = text(celula(r, 0));
      if (nume) venituri.push({ rand: r + 1, nume, plan: numar(celula(r, 1)), real: numar(celula(r, 2)) });
    }
  }

  const categorii: RandCategorie[] = [];
  if (randAntetCat >= 0) {
    for (let r = randAntetCat + 1; r < grila.length; r++) {
      const nume = text(celula(r, 0));
      if (nume.toLowerCase().startsWith("total")) break;
      if (!nume) continue;
      categorii.push({ rand: r + 1, nume, tip: text(celula(r, 1)), plan: numar(celula(r, 2)), real: numar(celula(r, 3)) });
    }
  }

  const tranzactii: Tranzactie[] = [];
  let ultim = antetTx ? antetTx.rand : 0;
  if (antetTx) {
    const c0 = antetTx.coloana - 1;
    for (let r = antetTx.rand; r < grila.length; r++) {
      const bucata = (grila[r] ?? []).slice(c0, c0 + 5);
      if (!bucata.some((v) => text(v) !== "")) continue;
      ultim = r + 1;
      const categorie = text(bucata[1]);
      if (!categorie) continue;
      tranzactii.push({
        rand: r + 1,
        data: ziDinFoaie(bucata[0]),
        categorie,
        suma: numar(bucata[2]),
        descriere: text(bucata[3]),
        finantare: antetTx.areFinantare ? text(bucata[4]) : "",
      });
    }
  }

  return {
    venituri,
    randTotalVenituri: randTotalVenituri >= 0 ? randTotalVenituri + 1 : null,
    categorii,
    antetTx,
    tranzactii,
    randUrmator: ultim + 1,
  };
}

export const dinEconomii = (finantare: string) => finantare.startsWith(PREFIX_DIN);

export type SumarLuna = {
  venitTotal: number;
  venitOcazional: number;
  venitRecurent: number;
  venitPlanificat: number;
  grupe: { tip: TipGrupa; eticheta: string; real: number; plan: number; procent: number }[];
  consum: number;
  economisit: number;
  investit: number;
  rataEconomisire: number;
  rataInvestire: number;
  platitDinEconomii: number;
  net: number;
  ramasDinPlan: number;
};

export function sumarLuna(luna: Luna): SumarLuna {
  const venitTotal = luna.venituri.reduce((t, v) => t + v.real, 0);
  const venitPlanificat = luna.venituri.reduce((t, v) => t + v.plan, 0);
  const venitOcazional = luna.venituri.filter((v) => VENITURI_OCAZIONALE.includes(v.nume)).reduce((t, v) => t + v.real, 0);
  const grupe = GRUPE.map((g) => {
    const din = luna.categorii.filter((c) => c.tip === g.tip);
    const real = r2(din.reduce((t, c) => t + c.real, 0));
    return { tip: g.tip, eticheta: g.eticheta, real, plan: r2(din.reduce((t, c) => t + c.plan, 0)), procent: venitTotal > 0 ? real / venitTotal : 0 };
  });
  const suma = (economie: boolean) => r2(grupe.filter((g) => GRUPE.find((x) => x.tip === g.tip)!.economie === economie).reduce((t, g) => t + g.real, 0));
  const economisit = suma(true);
  const consum = suma(false);
  const investit = grupe.find((g) => g.tip === "Avere")!.real;
  const totalReal = luna.categorii.reduce((t, c) => t + c.real, 0);
  const totalPlan = luna.categorii.reduce((t, c) => t + c.plan, 0);
  return {
    venitTotal: r2(venitTotal),
    venitOcazional: r2(venitOcazional),
    venitRecurent: r2(venitTotal - venitOcazional),
    venitPlanificat: r2(venitPlanificat),
    grupe,
    consum,
    economisit,
    investit,
    rataEconomisire: venitTotal > 0 ? economisit / venitTotal : 0,
    rataInvestire: venitTotal > 0 ? investit / venitTotal : 0,
    platitDinEconomii: r2(luna.tranzactii.filter((t) => dinEconomii(t.finantare)).reduce((s, t) => s + t.suma, 0)),
    net: r2(venitTotal - totalReal),
    ramasDinPlan: r2(totalPlan - totalReal),
  };
}

/** Fondurile din tabelul lunii (Tip = Fond sau Avere). */
export const fonduriDinLuna = (luna: Luna) => luna.categorii.filter((c) => c.tip === "Fond" || c.tip === "Avere");

/** Opțiunile coloanei „Finanțat din”, fără „Venit lună”. */
export function surseDinEconomii(luna: Luna) {
  const fonduri = fonduriDinLuna(luna).map((c) => PREFIX_DIN + c.nume);
  const areGenerale = fonduri.some((f) => f.toLowerCase() === DIN_ECONOMII_GENERALE.toLowerCase());
  return [...fonduri, ...(areGenerale ? [] : [DIN_ECONOMII_GENERALE]), DIN_AJUTOR_FAMILIE];
}

/** „Din Fond Tech” → scopul conturilor din care plătim („Din economii generale” → Nealocat). */
export function scopDinFinantare(finantare: string) {
  if (finantare === DIN_ECONOMII_GENERALE) return "Nealocat";
  if (finantare === DIN_AJUTOR_FAMILIE) return null;
  return finantare.startsWith(PREFIX_DIN) ? finantare.slice(PREFIX_DIN.length) : null;
}

/* ------------------------------------------------------------ foaia Economii */

export type Cont = {
  rand: number;
  institutie: string;
  produs: string;
  tip: string;
  titular: string;
  moneda: string;
  sold: number;
  curs: number;
  soldLei: number;
  dobanda: number;
  lichiditate: string;
  scadenta: string | null;
  scop: string;
  depus: number;
  actualizat: string | null;
  nota: string;
};

export type Economii = {
  conturi: Cont[];
  impozit: number;
  costBazaFoaie: number;
  luniTinta: number;
  /** Rândurile 13–42 fără nimic în coloanele de completat. */
  randuriLibere: number[];
};

/** Citește foaia Economii din grila A1:R42 (UNFORMATTED_VALUE). */
export function citesteEconomii(grila: unknown[][]): Economii {
  const c = (r: number, col: number) => grila[r - 1]?.[col - 1];
  const conturi: Cont[] = [];
  const randuriLibere: number[] = [];
  for (let r = ECONOMII_PRIM; r <= ECONOMII_ULTIM; r++) {
    const institutie = text(c(r, 1)), produs = text(c(r, 2)), sold = numar(c(r, 6));
    if (!institutie && !produs && !text(c(r, 3)) && !sold) {
      randuriLibere.push(r);
      continue;
    }
    const curs = numar(c(r, 7)) || 1;
    conturi.push({
      rand: r, institutie, produs, tip: text(c(r, 3)), titular: text(c(r, 4)),
      moneda: text(c(r, 5)) || "RON", sold, curs,
      soldLei: numar(c(r, 8)) || r2(sold * curs),
      dobanda: numar(c(r, 9)), lichiditate: text(c(r, 11)), scadenta: ziDinFoaie(c(r, 12)),
      scop: text(c(r, 14)), depus: numar(c(r, 15)), actualizat: ziDinFoaie(c(r, 17)), nota: text(c(r, 18)),
    });
  }
  return {
    conturi,
    impozit: typeof c(9, 1) === "number" ? (c(9, 1) as number) : 0.1,
    costBazaFoaie: numar(c(9, 5)),
    luniTinta: numar(c(9, 7)) || 6,
    randuriLibere,
  };
}

export function etichetaCont(c: Pick<Cont, "institutie" | "produs" | "tip" | "moneda">) {
  return [c.institutie || "—", c.produs || c.tip, c.moneda].filter(Boolean).join(" · ");
}

/** Ce trimitem unui ecran despre un cont: doar ce e de arătat și de ales. */
export type ContPeEcran = {
  rand: number; eticheta: string; institutie: string; tip: string; titular: string; moneda: string;
  sold: number; curs: number; soldLei: number; scop: string; lichiditate: string; dobanda: number;
  scadenta: string | null; depus: number; investitie: boolean; cuScadenta: boolean;
};

export function contPeEcran(c: Cont): ContPeEcran {
  return {
    rand: c.rand, eticheta: etichetaCont(c), institutie: c.institutie, tip: c.tip, titular: c.titular, moneda: c.moneda,
    sold: c.sold, curs: c.curs, soldLei: c.soldLei, scop: c.scop, lichiditate: c.lichiditate, dobanda: c.dobanda,
    scadenta: c.scadenta, depus: c.depus, investitie: esteInvestitie(c), cuScadenta: areScadenta(c),
  };
}

export const esteInvestitie = (c: Pick<Cont, "tip">) => TIPURI_INVESTITII.includes(c.tip);
export const areScadenta = (c: Pick<Cont, "tip">) => TIPURI_CU_SCADENTA.includes(c.tip);

/** Contul implicit al unui fond: întâi cele lichide, apoi oricare cu același scop. */
export function contPentruScop(conturi: Cont[], scop: string) {
  const cu = conturi.filter((c) => c.scop === scop && !areScadenta(c));
  return cu.find((c) => c.lichiditate === "Imediat") ?? cu[0] ?? null;
}

/** Suma primită în moneda destinației, după cursurile față de RON din foaie. */
export function conversie(suma: number, cursDin: number, cursIn: number) {
  return r2((suma * (cursDin || 1)) / (cursIn || 1));
}

/** Dobânda netă pe o perioadă; titlurile de stat sunt scutite de impozit. */
export function dobandaNeta(suma: number, rataBruta: number, zile: number, scutit: boolean, impozit: number) {
  if (!(zile > 0) || !(rataBruta > 0)) return 0;
  return r2((suma * rataBruta * zile) / 365 * (scutit ? 1 : 1 - (impozit || 0)));
}

/** Costul (Depus total) după o retragere: scade proporțional cu partea retrasă. */
export function costDupaRetragere(depus: number, sold: number, retras: number) {
  if (!(depus > 0) || !(sold > 0)) return depus;
  return r2(depus * Math.max(0, 1 - retras / sold));
}

/** „constituit 05.11.2026 · 6 luni” → { start, luni }. */
export function citesteNotaDepozit(nota: string) {
  const m = /constituit\s+(\d{2})\.(\d{2})\.(\d{4})/i.exec(nota);
  const l = /(\d+)\s*lun/i.exec(nota);
  return { start: m ? `${m[3]}-${m[2]}-${m[1]}` : null, luni: l ? Number(l[1]) : null };
}

/**
 * Numele produsului după prelungire. Se schimbă doar termenul dintr-un nume pus
 * de aplicație („Depozit 3 luni”); „Fidelis 2027” rămâne cum l-ai numit.
 */
export function produsDupaPrelungire(produs: string, luni: number) {
  const m = /^(Depozit|Titluri de stat) \d+ luni$/.exec(produs.trim());
  return m ? `${m[1]} ${luni} luni` : produs;
}

/* ------------------------------------------------------------ fondurile */

export type Tinta = { tinta: number | null; panaLa: string | null };

/** Țintele din foaia Fonduri (grila A1:F…): rândul cu „Fond … Țintă”, apoi un fond pe rând. */
export function citesteTinte(grila: unknown[][]) {
  const tinte = new Map<string, Tinta>();
  const antet = grila.findIndex((r) => text(r?.[0]) === "Fond" && text(r?.[4]) === "Țintă");
  if (antet < 0) return tinte;
  for (let i = antet + 1; i < grila.length; i++) {
    const nume = text(grila[i]?.[0]);
    if (!nume || nume === "TOTAL") continue;
    const t = grila[i]?.[4];
    tinte.set(nume, { tinta: typeof t === "number" && t > 0 ? t : null, panaLa: ziDinFoaie(grila[i]?.[5]) });
  }
  return tinte;
}

export type Fond = {
  nume: string;
  tip: string;
  inConturi: number;
  conturi: Cont[];
  tinta: number | null;
  panaLa: string | null;
  progres: number | null;
  necesarPeLuna: number | null;
  plan: number;
  pus: number;
  deMutat: number;
  platit: number;
};

/** Luni întregi între două zile (cel puțin 1), ca DATEDIF(…;"M"). */
export function luniIntre(deLa: string, panaLa: string) {
  const [a1, l1, z1] = deLa.split("-").map(Number);
  const [a2, l2, z2] = panaLa.split("-").map(Number);
  let luni = (a2 - a1) * 12 + (l2 - l1);
  if (z2 < z1) luni -= 1;
  return Math.max(1, luni);
}

export function fonduri(luna: Luna, economii: Economii, tinte: Map<string, Tinta>, azi: string, tintaUrgenta: number | null): Fond[] {
  return fonduriDinLuna(luna).map((c) => {
    const conturi = economii.conturi.filter((x) => x.scop === c.nume);
    const inConturi = r2(conturi.reduce((t, x) => t + x.soldLei, 0));
    const t = tinte.get(c.nume) ?? { tinta: null, panaLa: null };
    const tinta = t.tinta ?? (c.nume === FOND_URGENTA ? tintaUrgenta : null);
    const panaLa = t.panaLa;
    return {
      nume: c.nume,
      tip: c.tip,
      inConturi,
      conturi,
      tinta,
      panaLa,
      progres: tinta && tinta > 0 ? Math.min(1, inConturi / tinta) : null,
      necesarPeLuna: tinta && panaLa ? r2(Math.max(0, tinta - inConturi) / luniIntre(azi, panaLa > azi ? panaLa : azi)) : null,
      plan: c.plan,
      pus: c.real,
      deMutat: r2(Math.max(0, c.plan - c.real)),
      platit: r2(luna.tranzactii.filter((x) => x.finantare === PREFIX_DIN + c.nume).reduce((s, x) => s + x.suma, 0)),
    };
  });
}

/** Conturile cu bani al căror Scop nu e niciun fond. */
export function conturiFaraFond(economii: Economii, fonduriLuna: { nume: string }[]) {
  const nume = new Set(fonduriLuna.map((f) => f.nume));
  return economii.conturi.filter((c) => c.soldLei !== 0 && !nume.has(c.scop));
}

/** Costul de bază lunar: media Esențiale + Rate din lunile date, plus tampon. */
export function costDeBaza(luni: Luna[]) {
  if (!luni.length) return null;
  const baza = luni.reduce((t, l) => t + l.categorii.filter((c) => TIPURI_BAZA.includes(c.tip)).reduce((s, c) => s + c.real, 0), 0) / luni.length;
  return { baza: r2(baza), cuTampon: r2(baza * (1 + TAMPON_BAZA)) };
}

/* ------------------------------------------------------------ venitul ocazional */

export type Persoana = (typeof PERSOANE)[number];
export type Impartire = { investitii: number; fond: number; guiltFreeFilip: number; guiltFreeRalu: number };

/** Procente din ce rămâne după zeciuială. „Tot la Guilt free” depinde de „Pentru”. */
export const REGULI_OCAZIONAL = [
  { id: "standard", nume: "Standard: 50% Investitii · 30% fond · 10% + 10% Guilt free" },
  { id: "guiltfree", nume: "Tot la Guilt free (al cui e)" },
  { id: "fond", nume: "Tot într-un fond" },
  { id: "investitii", nume: "Tot la Investitii" },
] as const;
export type Regula = (typeof REGULI_OCAZIONAL)[number]["id"];

export function procenteRegula(regula: Regula, pentru: Persoana): Impartire {
  switch (regula) {
    case "standard": return { investitii: 50, fond: 30, guiltFreeFilip: 10, guiltFreeRalu: 10 };
    case "guiltfree":
      if (pentru === "Filip") return { investitii: 0, fond: 0, guiltFreeFilip: 100, guiltFreeRalu: 0 };
      if (pentru === "Ralu") return { investitii: 0, fond: 0, guiltFreeFilip: 0, guiltFreeRalu: 100 };
      return { investitii: 0, fond: 0, guiltFreeFilip: 50, guiltFreeRalu: 50 };
    case "fond": return { investitii: 0, fond: 100, guiltFreeFilip: 0, guiltFreeRalu: 0 };
    case "investitii": return { investitii: 100, fond: 0, guiltFreeFilip: 0, guiltFreeRalu: 0 };
  }
}

/**
 * Împarte un venit ocazional. Ultima parte nenulă ia restul de bani de la
 * rotunjire, ca suma să iasă exact.
 */
export function imparteVenit(suma: number, cuZeciuiala: boolean, procente: Impartire) {
  const s = r2(suma);
  const zeciuiala = cuZeciuiala ? r2(s * PROCENT_ZECIUIALA) : 0;
  const rest = r2(s - zeciuiala);
  const chei = ["investitii", "fond", "guiltFreeFilip", "guiltFreeRalu"] as const;
  const parti = Object.fromEntries(chei.map((k) => [k, r2((rest * procente[k]) / 100)])) as Impartire;
  const totalProcente = chei.reduce((t, k) => t + procente[k], 0);
  if (Math.abs(totalProcente - 100) < 1e-9) {
    const ultim = [...chei].reverse().find((k) => procente[k] > 0);
    if (ultim) parti[ultim] = r2(rest - chei.filter((k) => k !== ultim).reduce((t, k) => t + parti[k], 0));
  }
  return { suma: s, zeciuiala, rest, ...parti };
}
