import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/*
  Schema completă a aplicației „Acasă”.

  E scrisă dintr-o bucată pentru toate etapele planificate (cumpărături, cămară,
  bonuri, rețete, curățenie, planificator, calendar, bagaje), chiar dacă interfața
  pentru unele dintre ele vine mai târziu. Motivul: legăturile dintre tabele sunt
  partea greu de schimbat ulterior, iar aici aproape totul se leagă de „produse”
  și de „persoane”.

  Convenții:
  - datele calendaristice simple sunt text „AAAA-LL-ZZ” (se sortează corect, se
    compară ușor, nu au fus orar);
  - momentele exacte sunt `integer` timestamp în secunde;
  - marcăm „arhivat/inactiv” în loc să ștergem, ca să nu rupem istoricul de prețuri.
*/

const acum = sql`(unixepoch())`;

/* ---------------------------------------------------------------- persoane */

export const persoane = sqliteTable(
  "persoane",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nume: text("nume").notNull(),
    // Codul de acces are forma ABCD-EFGHJK: primele 4 caractere sunt publice și
    // servesc la căutare, restul de 6 sunt hash-uite. Vezi lib/autentificare.ts.
    codPublic: text("cod_public").notNull(),
    codHash: text("cod_hash").notNull(),
    esteAdmin: integer("este_admin", { mode: "boolean" }).notNull().default(false),
    activ: integer("activ", { mode: "boolean" }).notNull().default(true),
    // Calendarul Google al persoanei, partajat cu contul de serviciu (doar citire).
    calendarGoogleId: text("calendar_google_id"),
    creatLa: integer("creat_la").notNull().default(acum),
  },
  (t) => [uniqueIndex("persoane_cod_public").on(t.codPublic)],
);

export const abonamentePush = sqliteTable(
  "abonamente_push",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    persoanaId: integer("persoana_id")
      .notNull()
      .references(() => persoane.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    cheieP256dh: text("cheie_p256dh").notNull(),
    cheieAuth: text("cheie_auth").notNull(),
    creatLa: integer("creat_la").notNull().default(acum),
    ultimaReusitaLa: integer("ultima_reusita_la"),
    esecuriLaRand: integer("esecuri_la_rand").notNull().default(0),
  },
  (t) => [uniqueIndex("abonamente_push_endpoint").on(t.endpoint)],
);

// Limitarea încercărilor de autentificare, ținută pe IP și pe cod.
export const incercariAutentificare = sqliteTable(
  "incercari_autentificare",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cheie: text("cheie").notNull(),
    la: integer("la").notNull().default(acum),
  },
  (t) => [index("incercari_cheie_la").on(t.cheie, t.la)],
);

/* -------------------------------------------------- produse și cumpărături */

export const categorii = sqliteTable("categorii", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nume: text("nume").notNull(),
  // Ordinea în care le parcurgem prin magazin, ca să nu umblăm înainte și înapoi.
  ordine: integer("ordine").notNull().default(0),
  // Categoria corespunzătoare din foaia de buget (ex. „Mâncare”, „Curatenie”).
  categorieBuget: text("categorie_buget"),
  activ: integer("activ", { mode: "boolean" }).notNull().default(true),
});

export const magazine = sqliteTable("magazine", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nume: text("nume").notNull(),
  activ: integer("activ", { mode: "boolean" }).notNull().default(true),
});

export const produse = sqliteTable(
  "produse",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nume: text("nume").notNull(),
    categorieId: integer("categorie_id").references(() => categorii.id),
    unitate: text("unitate").notNull().default("buc"), // buc | kg | g | l | ml
    cantitateImplicita: real("cantitate_implicita").notNull().default(1),
    codBare: text("cod_bare"),
    pozaUrl: text("poza_url"),
    // Ultimul preț cunoscut, ținut aici ca să nu-l recalculăm la fiecare listă.
    pretUltim: real("pret_ultim"),
    magazinUltimId: integer("magazin_ultim_id").references(() => magazine.id),
    // Câte zile ține de obicei produsul — din asta propunem data de expirare
    // când intră în cămară, ca să nu o tastăm de fiecare dată.
    zileValabilitate: integer("zile_valabilitate"),
    // La cât timp îl cumpărăm de obicei; îl calculează aplicația din istoric.
    ritmZile: real("ritm_zile"),
    ultimaCumparareLa: text("ultima_cumparare_la"),
    arhivat: integer("arhivat", { mode: "boolean" }).notNull().default(false),
    creatLa: integer("creat_la").notNull().default(acum),
  },
  (t) => [index("produse_nume").on(t.nume), uniqueIndex("produse_cod_bare").on(t.codBare)],
);

export const preturi = sqliteTable(
  "preturi",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    produsId: integer("produs_id")
      .notNull()
      .references(() => produse.id, { onDelete: "cascade" }),
    magazinId: integer("magazin_id").references(() => magazine.id),
    pret: real("pret").notNull(),
    cantitate: real("cantitate").notNull().default(1),
    unitate: text("unitate").notNull().default("buc"),
    data: text("data").notNull(),
    sursa: text("sursa").notNull().default("manual"), // manual | bon | scanare
  },
  (t) => [index("preturi_produs_data").on(t.produsId, t.data)],
);

export const liste = sqliteTable("liste", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nume: text("nume").notNull().default("Cumpărături"),
  magazinId: integer("magazin_id").references(() => magazine.id),
  finalizataLa: integer("finalizata_la"),
  totalReal: real("total_real"),
  // Momentul în care cumpărăturile au fost trecute în foaia de buget.
  trimisInBugetLa: integer("trimis_in_buget_la"),
  creatLa: integer("creat_la").notNull().default(acum),
});

export const articoleLista = sqliteTable(
  "articole_lista",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listaId: integer("lista_id")
      .notNull()
      .references(() => liste.id, { onDelete: "cascade" }),
    // Fie produs din catalog, fie doar text (ce scrii repede și nu merită catalogat).
    produsId: integer("produs_id").references(() => produse.id),
    text: text("text"),
    cantitate: real("cantitate").notNull().default(1),
    unitate: text("unitate").notNull().default("buc"),
    pretEstimat: real("pret_estimat"),
    bifat: integer("bifat", { mode: "boolean" }).notNull().default(false),
    bifatDe: integer("bifat_de").references(() => persoane.id),
    bifatLa: integer("bifat_la"),
    adaugatDe: integer("adaugat_de").references(() => persoane.id),
    adaugatLa: integer("adaugat_la").notNull().default(acum),
    // De unde a ajuns pe listă: manual | reteta | camara | ritm | bon
    sursa: text("sursa").notNull().default("manual"),
    retetaId: integer("reteta_id"),
  },
  (t) => [index("articole_lista_lista").on(t.listaId)],
);

/* --------------------------------------- cămara, frigiderul, congelatorul */

export const stoc = sqliteTable(
  "stoc",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    produsId: integer("produs_id")
      .notNull()
      .references(() => produse.id, { onDelete: "cascade" }),
    cantitate: real("cantitate").notNull().default(1),
    unitate: text("unitate").notNull().default("buc"),
    loc: text("loc").notNull().default("camara"), // camara | frigider | congelator
    expiraLa: text("expira_la"),
    adaugatLa: text("adaugat_la").notNull(),
    adaugatDe: integer("adaugat_de").references(() => persoane.id),
    consumatLa: integer("consumat_la"),
    notite: text("notite"),
  },
  (t) => [index("stoc_expira").on(t.expiraLa), index("stoc_produs").on(t.produsId)],
);

/* ------------------------------------------------------------------ bonuri */

export const bonuri = sqliteTable("bonuri", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  magazinId: integer("magazin_id").references(() => magazine.id),
  data: text("data"),
  total: real("total"),
  pozaUrl: text("poza_url"),
  stare: text("stare").notNull().default("nou"), // nou | procesat | eroare | confirmat
  raspunsAi: text("raspuns_ai"),
  eroare: text("eroare"),
  trimisInBugetLa: integer("trimis_in_buget_la"),
  adaugatDe: integer("adaugat_de").references(() => persoane.id),
  creatLa: integer("creat_la").notNull().default(acum),
});

export const articoleBon = sqliteTable("articole_bon", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bonId: integer("bon_id")
    .notNull()
    .references(() => bonuri.id, { onDelete: "cascade" }),
  textOriginal: text("text_original").notNull(),
  produsId: integer("produs_id").references(() => produse.id),
  categorieId: integer("categorie_id").references(() => categorii.id),
  cantitate: real("cantitate").notNull().default(1),
  pret: real("pret").notNull(),
  confirmat: integer("confirmat", { mode: "boolean" }).notNull().default(false),
});

/* ------------------------------------------------------------------ rețete */

export const retete = sqliteTable(
  "retete",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    titlu: text("titlu").notNull(),
    sursa: text("sursa").notNull().default("manual"), // cookidoo | manual | link
    sursaId: text("sursa_id"),
    url: text("url"),
    pozaUrl: text("poza_url"),
    portii: integer("portii").notNull().default(2),
    minuteTotal: integer("minute_total"),
    laTm6: integer("la_tm6", { mode: "boolean" }).notNull().default(false),
    efort: text("efort").notNull().default("mediu"), // usor | mediu | greu
    // Etichete pentru sugestii („bogat în fier”, „ușor de digerat”, „reîncălzibil”).
    etichete: text("etichete", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    instructiuni: text("instructiuni"),
    favorit: integer("favorit", { mode: "boolean" }).notNull().default(false),
    sincronizatLa: integer("sincronizat_la"),
    creatLa: integer("creat_la").notNull().default(acum),
  },
  (t) => [index("retete_sursa").on(t.sursa, t.sursaId)],
);

export const ingredienteReteta = sqliteTable("ingrediente_reteta", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  retetaId: integer("reteta_id")
    .notNull()
    .references(() => retete.id, { onDelete: "cascade" }),
  textOriginal: text("text_original").notNull(),
  produsId: integer("produs_id").references(() => produse.id),
  cantitate: real("cantitate"),
  unitate: text("unitate"),
  optional: integer("optional", { mode: "boolean" }).notNull().default(false),
});

export const planMese = sqliteTable(
  "plan_mese",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    data: text("data").notNull(),
    moment: text("moment").notNull().default("cina"), // mic-dejun | pranz | cina | gustare
    retetaId: integer("reteta_id").references(() => retete.id),
    textLiber: text("text_liber"),
    portii: integer("portii"),
    gatitDe: integer("gatit_de").references(() => persoane.id),
    gatitLa: integer("gatit_la"),
  },
  (t) => [index("plan_mese_data").on(t.data)],
);

/* ------------------------------------------------------------------- ciclu */

export const cicluri = sqliteTable(
  "cicluri",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    persoanaId: integer("persoana_id")
      .notNull()
      .references(() => persoane.id, { onDelete: "cascade" }),
    inceput: text("inceput").notNull(),
    sfarsit: text("sfarsit"),
    notite: text("notite"),
  },
  (t) => [index("cicluri_persoana_inceput").on(t.persoanaId, t.inceput)],
);

// Cum s-a simțit cineva într-o zi anume. Din astea, plus faza ciclului și ce s-a
// gătit, ies în timp tipare proprii — nu recomandări generice de pe internet.
export const stariZilnice = sqliteTable(
  "stari_zilnice",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    persoanaId: integer("persoana_id")
      .notNull()
      .references(() => persoane.id, { onDelete: "cascade" }),
    data: text("data").notNull(),
    energie: integer("energie"), // 1-5
    simptome: text("simptome", { mode: "json" }).$type<string[]>(),
    notite: text("notite"),
  },
  (t) => [uniqueIndex("stari_persoana_data").on(t.persoanaId, t.data)],
);

/* ---------------------------------------------- zone, curățenie, declutter */

export const zone = sqliteTable("zone", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nume: text("nume").notNull(),
  ordine: integer("ordine").notNull().default(0),
  // Poziția în rotația lunară de declutter.
  ordineDeclutter: integer("ordine_declutter"),
  ultimulDeclutterLa: text("ultimul_declutter_la"),
  activ: integer("activ", { mode: "boolean" }).notNull().default(true),
});

export const sarcini = sqliteTable(
  "sarcini",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    zonaId: integer("zona_id").references(() => zone.id, { onDelete: "cascade" }),
    titlu: text("titlu").notNull(),
    descriere: text("descriere"),
    tip: text("tip").notNull().default("curatenie"), // curatenie | declutter | intretinere | unica
    // Recurența pleacă de la ultima efectuare, nu de la o dată fixă în calendar.
    frecventaZile: integer("frecventa_zile"),
    minuteEstimate: integer("minute_estimate").notNull().default(20),
    efort: text("efort").notNull().default("mediu"), // usor | mediu | greu
    atribuitLui: integer("atribuit_lui").references(() => persoane.id),
    // Dacă e adevărat, sarcina alternează între persoane la fiecare efectuare.
    rotatie: integer("rotatie", { mode: "boolean" }).notNull().default(false),
    ultimaEfectuareLa: text("ultima_efectuare_la"),
    urmatoareaLa: text("urmatoarea_la"),
    // Sarcinile grele nu se propun în zilele cu menstruație.
    evitaLaMenstruatie: integer("evita_la_menstruatie", { mode: "boolean" })
      .notNull()
      .default(false),
    activ: integer("activ", { mode: "boolean" }).notNull().default(true),
    creatLa: integer("creat_la").notNull().default(acum),
  },
  (t) => [index("sarcini_urmatoarea").on(t.urmatoareaLa)],
);

export const efectuari = sqliteTable(
  "efectuari",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sarcinaId: integer("sarcina_id")
      .notNull()
      .references(() => sarcini.id, { onDelete: "cascade" }),
    persoanaId: integer("persoana_id").references(() => persoane.id),
    data: text("data").notNull(),
    minuteReale: integer("minute_reale"),
    notite: text("notite"),
  },
  (t) => [index("efectuari_sarcina_data").on(t.sarcinaId, t.data)],
);

// Ce a propus motorul de planificare pentru o zi anume, și ce s-a ales din ele.
export const propuneri = sqliteTable(
  "propuneri",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    data: text("data").notNull(),
    persoanaId: integer("persoana_id")
      .notNull()
      .references(() => persoane.id, { onDelete: "cascade" }),
    sarcinaId: integer("sarcina_id").references(() => sarcini.id, { onDelete: "cascade" }),
    oraStart: text("ora_start"),
    minute: integer("minute"),
    stare: text("stare").notNull().default("propus"), // propus | acceptat | amanat | refuzat | facut
    raspunsLa: integer("raspuns_la"),
    // Se completează doar dacă persoana alege explicit să treacă sarcina în Google Calendar.
    evenimentGoogleId: text("eveniment_google_id"),
    creatLa: integer("creat_la").notNull().default(acum),
  },
  (t) => [index("propuneri_data_persoana").on(t.data, t.persoanaId)],
);

/* --------------------------------------------- calendarul casei, remindere */

export const evenimente = sqliteTable(
  "evenimente",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    titlu: text("titlu").notNull(),
    categorie: text("categorie").notNull().default("casa"), // masina | casa | sanatate | documente | altele
    data: text("data"),
    // Se repetă la N luni de la ultima efectuare (ITP la 24, detartraj la 6).
    recurentaLuni: integer("recurenta_luni"),
    ultimaEfectuareLa: text("ultima_efectuare_la"),
    remindereZileInainte: integer("remindere_zile_inainte").notNull().default(7),
    notite: text("notite"),
    activ: integer("activ", { mode: "boolean" }).notNull().default(true),
    creatDe: integer("creat_de").references(() => persoane.id),
    // Se completează doar dacă cineva a bifat explicit „trece-l și în Google”.
    // Ținem și calendarul, nu doar id-ul evenimentului: fără el n-am ști pe unde
    // să-l ștergem sau să-l mutăm mai târziu.
    googleCalendarId: text("google_calendar_id"),
    googleEvenimentId: text("google_eveniment_id"),
  },
  (t) => [index("evenimente_data").on(t.data)],
);

export const remindere = sqliteTable(
  "remindere",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deLa: integer("de_la")
      .notNull()
      .references(() => persoane.id, { onDelete: "cascade" }),
    catre: integer("catre")
      .notNull()
      .references(() => persoane.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    cand: integer("cand").notNull(),
    trimisLa: integer("trimis_la"),
    vazutLa: integer("vazut_la"),
    creatLa: integer("creat_la").notNull().default(acum),
  },
  (t) => [index("remindere_cand").on(t.cand, t.trimisLa)],
);

/* -------------------------------------------------------- dorințe și bagaje */

export const dorinte = sqliteTable("dorinte", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titlu: text("titlu").notNull(),
  url: text("url"),
  pret: real("pret"),
  categorie: text("categorie"),
  prioritate: integer("prioritate").notNull().default(2), // 1 = curând, 3 = cândva
  pozaUrl: text("poza_url"),
  notite: text("notite"),
  stare: text("stare").notNull().default("idee"), // idee | cumparat
  creatDe: integer("creat_de").references(() => persoane.id),
  creatLa: integer("creat_la").notNull().default(acum),
});

export const sabloaneBagaj = sqliteTable("sabloane_bagaj", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nume: text("nume").notNull(),
  notite: text("notite"),
});

export const articoleSablonBagaj = sqliteTable("articole_sablon_bagaj", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sablonId: integer("sablon_id")
    .notNull()
    .references(() => sabloaneBagaj.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  categorie: text("categorie"),
  ordine: integer("ordine").notNull().default(0),
});

export const bagaje = sqliteTable("bagaje", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sablonId: integer("sablon_id").references(() => sabloaneBagaj.id),
  nume: text("nume").notNull(),
  dataPlecare: text("data_plecare"),
  dataIntoarcere: text("data_intoarcere"),
  creatLa: integer("creat_la").notNull().default(acum),
});

export const articoleBagaj = sqliteTable("articole_bagaj", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bagajId: integer("bagaj_id")
    .notNull()
    .references(() => bagaje.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  categorie: text("categorie"),
  pentruPersoana: integer("pentru_persoana").references(() => persoane.id),
  bifat: integer("bifat", { mode: "boolean" }).notNull().default(false),
});

/* --------------------------------------------------------- buget și setări */

// Copie locală a foii de buget, ca să nu interogăm Google la fiecare ecran.
export const bugetLunar = sqliteTable(
  "buget_lunar",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    luna: text("luna").notNull(), // AAAA-LL
    categorie: text("categorie").notNull(),
    planificat: real("planificat").notNull().default(0),
    real: real("real").notNull().default(0),
    actualizatLa: integer("actualizat_la").notNull().default(acum),
  },
  (t) => [uniqueIndex("buget_luna_categorie").on(t.luna, t.categorie)],
);

/*
  Oglinda locală a tranzacțiilor trimise în foaie.

  Foaia rămâne sursa de adevăr; tabelul ăsta există ca să putem arăta imediat ce
  s-a trimis din aplicație, fără să recitim sute de rânduri din Google la fiecare
  deschidere de ecran, și ca să știm ce a mai rămas de trimis dacă pică internetul.
*/
export const tranzactii = sqliteTable(
  "tranzactii",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    luna: text("luna").notNull(), // AAAA-LL
    data: text("data").notNull(),
    categorie: text("categorie").notNull(),
    suma: real("suma").notNull(),
    descriere: text("descriere"),
    // manual | lista | bon
    sursa: text("sursa").notNull().default("manual"),
    listaId: integer("lista_id").references(() => liste.id),
    bonId: integer("bon_id").references(() => bonuri.id),
    adaugatDe: integer("adaugat_de").references(() => persoane.id),
    // Rândul din foaie în care a fost scrisă; gol dacă n-a plecat încă.
    randSheet: integer("rand_sheet"),
    trimisLa: integer("trimis_la"),
    eroare: text("eroare"),
    creatLa: integer("creat_la").notNull().default(acum),
  },
  (t) => [index("tranzactii_luna").on(t.luna), index("tranzactii_trimis").on(t.trimisLa)],
);

export const setari = sqliteTable("setari", {
  cheie: text("cheie").primaryKey(),
  valoare: text("valoare", { mode: "json" }).notNull(),
});

export const setariPersoana = sqliteTable(
  "setari_persoana",
  {
    persoanaId: integer("persoana_id")
      .notNull()
      .references(() => persoane.id, { onDelete: "cascade" }),
    cheie: text("cheie").notNull(),
    valoare: text("valoare", { mode: "json" }).notNull(),
  },
  (t) => [uniqueIndex("setari_persoana_cheie").on(t.persoanaId, t.cheie)],
);

export type Persoana = typeof persoane.$inferSelect;
export type Produs = typeof produse.$inferSelect;
export type ArticolLista = typeof articoleLista.$inferSelect;
export type Categorie = typeof categorii.$inferSelect;
export type Magazin = typeof magazine.$inferSelect;
export type Sarcina = typeof sarcini.$inferSelect;
