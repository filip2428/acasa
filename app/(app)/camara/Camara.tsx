"use client";

import { useMemo, useState, useTransition } from "react";

import { azi, cantitate as scrieCantitatea } from "@/lib/formatare";
import { LOCURI, type RandStoc } from "@/lib/domeniu";
import {
  cifraInCamp,
  citesteCifra,
  convertesteCantitatea,
  pasulCantitatii,
  rotunjeste,
  UNITATI_CAMARA,
} from "@/lib/unitati";

import { propuneExpirarea, puneInCamara, schimbaCat, scoateDinCamara } from "./actiuni";

/*
  Cămara.

  Ecranul are o singură prioritate: ce expiră curând urcă în capul listei,
  indiferent unde stă. Restul e grupat pe locuri.

  Cantitatea se ține în unitatea în care o ai de fapt: 350 g de brânză rămase,
  un borcan de zacuscă, 0,75 l de lapte. Când schimbi unitatea între grame și
  kilograme, cifra se socotește singură; între bucăți și grame n-are cum, deci
  rămâne cum era.
*/

type ProdusDisponibil = {
  id: number;
  nume: string;
  unitate: string;
  cantitateImplicita: number;
  zileValabilitate: number | null;
  esteInCamara: boolean;
};

type Porneste = (actiune: () => void | Promise<void>) => void;

export default function Camara({
  stoc,
  produse,
}: {
  stoc: RandStoc[];
  produse: ProdusDisponibil[];
}) {
  const [locAles, setLocAles] = useState<string | null>(null);
  const [adaugare, setAdaugare] = useState(false);
  const [, porneste] = useTransition();

  const deConsumat = stoc.filter(
    (r) => r.zilePanaLaExpirare != null && r.zilePanaLaExpirare <= 3,
  );

  const restul = useMemo(() => {
    const fara = stoc.filter((r) => !deConsumat.includes(r));
    return LOCURI.map((loc) => ({
      ...loc,
      randuri: fara.filter((r) => r.loc === loc.valoare),
    })).filter((g) => g.randuri.length > 0 && (!locAles || locAles === g.valoare));
  }, [stoc, deConsumat, locAles]);

  return (
    <>
      {deConsumat.length > 0 && (
        <section>
          <h2 className="eticheta mb-1.5 px-1">Mănâncă-le primele</h2>
          <ul className="card card-lipit overflow-hidden">
            {deConsumat.map((rand) => (
              <Rand key={rand.id} rand={rand} porneste={porneste} />
            ))}
          </ul>
        </section>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={() => setLocAles(null)}
          aria-pressed={locAles === null}
          className={`buton buton-mic shrink-0 ${
            locAles === null ? "buton-principal" : "buton-secundar"
          }`}
        >
          Tot
        </button>
        {LOCURI.map((loc) => {
          const cate = stoc.filter((r) => r.loc === loc.valoare).length;
          return (
            <button
              key={loc.valoare}
              type="button"
              onClick={() => setLocAles(loc.valoare)}
              aria-pressed={locAles === loc.valoare}
              className={`buton buton-mic shrink-0 ${
                locAles === loc.valoare ? "buton-principal" : "buton-secundar"
              }`}
            >
              {loc.eticheta}
              {cate > 0 && <span className="cifre opacity-60">{cate}</span>}
            </button>
          );
        })}
      </div>

      {stoc.length === 0 && (
        <p className="px-1 py-8 text-center text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
          Cămara e goală. Adaugă ce aveți în casă și aplicația vă spune ce expiră,
          cu două zile înainte.
        </p>
      )}

      {restul.map((grupa) => (
        <section key={grupa.valoare}>
          <h2 className="eticheta mb-1.5 px-1">{grupa.eticheta}</h2>
          <ul className="card card-lipit overflow-hidden">
            {grupa.randuri.map((rand) => (
              <Rand key={rand.id} rand={rand} porneste={porneste} />
            ))}
          </ul>
        </section>
      ))}

      <button
        type="button"
        className="buton buton-principal w-full"
        onClick={() => setAdaugare(true)}
      >
        Pune ceva în cămară
      </button>

      {adaugare && (
        <FisaAdaugare produse={produse} laInchidere={() => setAdaugare(false)} />
      )}
    </>
  );
}

/* ------------------------------------------------------------ un rând din cămară */

function Rand({ rand, porneste }: { rand: RandStoc; porneste: Porneste }) {
  const [deschis, setDeschis] = useState(false);

  // Rândul își ține singur cantitatea după prima atingere: fiecare „+” pleacă spre
  // server în fundal, iar cifra de pe ecran nu așteaptă după el.
  const [cantitate, setCantitate] = useState(rand.cantitate);
  const [unitate, setUnitate] = useState(rand.unitate);
  const [text, setText] = useState(cifraInCamp(rand.cantitate));
  const [terminat, setTerminat] = useState(false);

  const zile = rand.zilePanaLaExpirare;
  const pas = pasulCantitatii(unitate);

  function salveaza(noua: number, nouaUnitate = unitate) {
    const valoare = rotunjeste(noua);

    if (valoare <= 0) {
      setTerminat(true);
      porneste(() => scoateDinCamara(rand.id));
      return;
    }

    setCantitate(valoare);
    setUnitate(nouaUnitate);
    setText(cifraInCamp(valoare));
    porneste(() => schimbaCat(rand.id, valoare, nouaUnitate));
  }

  function schimbaUnitatea(noua: string) {
    // 1,5 kg devin 1500 g. Din bucăți în grame nu se poate socoti, deci cifra
    // rămâne și omul o corectează dacă vrea.
    salveaza(convertesteCantitatea(cantitate, unitate, noua) ?? cantitate, noua);
  }

  function citesteCampul() {
    const valoare = citesteCifra(text);
    if (valoare == null) {
      setText(cifraInCamp(cantitate));
      return;
    }
    if (valoare !== cantitate) salveaza(valoare);
  }

  if (terminat) return null;

  return (
    <li>
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setDeschis((d) => !d)}
          aria-expanded={deschis}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-[0.9375rem]">{rand.nume}</span>
          <span className="text-xs text-[var(--color-creion)]">
            <span className="cifre">{scrieCantitatea(cantitate, unitate)}</span>
            {zile != null && ` · ${textExpirare(zile)}`}
          </span>
        </button>

        {zile != null && zile < 0 && <span className="fisa fisa-caramida shrink-0">expirat</span>}
        {zile != null && zile >= 0 && zile <= 2 && (
          <span className="fisa fisa-alama shrink-0">curând</span>
        )}
      </div>

      {deschis && (
        <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3">
          {/* Butoanele au înălțimea câmpului. „.camp” nu se lasă micșorat — și nici
              n-ar trebui: sub 16px, Safari face zoom când îl atingi. */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Mai puțin cu ${scrieCantitatea(pas, unitate)}`}
              onClick={() => salveaza(cantitate - pas)}
              className="flex h-[2.875rem] w-10 items-center justify-center rounded-xl border border-[var(--color-linie)] bg-white text-lg"
            >
              −
            </button>
            <div className="w-[4.5rem]">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={citesteCampul}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                inputMode="decimal"
                aria-label={`Cât ${rand.nume} ai`}
                className="camp cifre text-center"
              />
            </div>
            <button
              type="button"
              aria-label={`Mai mult cu ${scrieCantitatea(pas, unitate)}`}
              onClick={() => salveaza(cantitate + pas)}
              className="flex h-[2.875rem] w-10 items-center justify-center rounded-xl border border-[var(--color-linie)] bg-white text-lg"
            >
              +
            </button>
          </div>

          <div className="w-[6.5rem]">
            <AlegeUnitatea valoare={unitate} laSchimbare={schimbaUnitatea} />
          </div>

          <button
            type="button"
            className="buton buton-mic buton-secundar ml-auto"
            onClick={() => salveaza(0)}
          >
            S-a terminat
          </button>
        </div>
      )}
    </li>
  );
}

function AlegeUnitatea({
  valoare,
  laSchimbare,
}: {
  valoare: string;
  laSchimbare: (unitate: string) => void;
}) {
  // O unitate venită din altă parte (un produs vechi, cu „cutie”) nu trebuie să
  // dispară din listă doar pentru că nu e printre cele obișnuite.
  const unitati: string[] = UNITATI_CAMARA.includes(valoare as (typeof UNITATI_CAMARA)[number])
    ? [...UNITATI_CAMARA]
    : [valoare, ...UNITATI_CAMARA];

  return (
    <select
      value={valoare}
      onChange={(e) => laSchimbare(e.target.value)}
      aria-label="Unitatea de măsură"
      className="camp"
    >
      {unitati.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

function textExpirare(zile: number) {
  if (zile < 0) return `a expirat acum ${Math.abs(zile)} ${Math.abs(zile) === 1 ? "zi" : "zile"}`;
  if (zile === 0) return "expiră azi";
  if (zile === 1) return "expiră mâine";
  return `mai are ${zile} zile`;
}

/* ------------------------------------------------------------------ adăugare */

function FisaAdaugare({
  produse,
  laInchidere,
}: {
  produse: ProdusDisponibil[];
  laInchidere: () => void;
}) {
  const [termen, setTermen] = useState("");
  const [ales, setAles] = useState<ProdusDisponibil | null>(null);
  const [cantitate, setCantitate] = useState("1");
  const [unitate, setUnitate] = useState("buc");
  const [loc, setLoc] = useState("camara");
  const [expiraLa, setExpiraLa] = useState<string>("");
  const [seSalveaza, porneste] = useTransition();

  const gasite = useMemo(() => {
    const curat = termen.trim().toLowerCase();
    if (!curat) return produse.slice(0, 8);
    return produse.filter((p) => p.nume.toLowerCase().includes(curat)).slice(0, 8);
  }, [produse, termen]);

  const valoare = citesteCifra(cantitate);

  function alege(produs: ProdusDisponibil) {
    setAles(produs);
    setCantitate(cifraInCamp(produs.cantitateImplicita));
    setUnitate(produs.unitate);
    porneste(async () => {
      const propusa = await propuneExpirarea(produs.id);
      setExpiraLa(propusa ?? "");
    });
  }

  function schimbaUnitatea(noua: string) {
    if (valoare != null) {
      const convertita = convertesteCantitatea(valoare, unitate, noua);
      if (convertita != null) setCantitate(cifraInCamp(convertita));
    }
    setUnitate(noua);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Închide"
        onClick={laInchidere}
        className="absolute inset-0 bg-black/35"
      />

      <section
        className="intra relative max-h-[90dvh] overflow-y-auto rounded-t-[1.5rem] bg-[var(--color-chit)] p-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-linie)]" />

        {!ales ? (
          <>
            <label className="block">
              <span className="eticheta">Ce pui</span>
              <input
                value={termen}
                onChange={(e) => setTermen(e.target.value)}
                className="camp mt-1"
                placeholder="Caută în catalog…"
                autoFocus
              />
            </label>

            <ul className="card card-lipit mt-3 overflow-hidden">
              {gasite.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => alege(p)}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{p.nume}</span>
                    {p.esteInCamara && <span className="fisa shrink-0">ai deja</span>}
                  </button>
                </li>
              ))}
              {gasite.length === 0 && (
                <li className="px-3.5 py-3 text-sm text-[var(--color-creion)]">
                  Nu e în catalog. Adaugă-l întâi din Listă → Catalog.
                </li>
              )}
            </ul>
          </>
        ) : (
          <>
            <p className="titlu text-xl">{ales.nume}</p>

            <fieldset className="mt-3">
              <legend className="eticheta">Cât ai</legend>
              <div className="mt-1 grid grid-cols-[1fr_7rem] gap-2">
                <input
                  value={cantitate}
                  onChange={(e) => setCantitate(e.target.value)}
                  inputMode="decimal"
                  aria-label="Cantitatea"
                  className="camp cifre"
                />
                <AlegeUnitatea valoare={unitate} laSchimbare={schimbaUnitatea} />
              </div>
            </fieldset>

            <label className="mt-3 block">
              <span className="eticheta">Unde</span>
              <select
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                className="camp mt-1"
              >
                {LOCURI.map((l) => (
                  <option key={l.valoare} value={l.valoare}>
                    {l.eticheta}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="eticheta">Expiră pe</span>
              <input
                type="date"
                value={expiraLa}
                min={azi()}
                onChange={(e) => setExpiraLa(e.target.value)}
                className="camp mt-1"
              />
              <span className="mt-1 block text-xs text-[var(--color-creion)]">
                {ales.zileValabilitate
                  ? `Propusă din cât ține de obicei (${ales.zileValabilitate} zile). Corecteaz-o dacă e altfel.`
                  : "Produsul n-are o durată obișnuită în catalog. Pune data de pe ambalaj."}
              </span>
            </label>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="buton buton-secundar flex-1"
                onClick={() => setAles(null)}
              >
                Alt produs
              </button>
              <button
                type="button"
                className="buton buton-principal flex-1"
                disabled={seSalveaza || valoare == null}
                onClick={() =>
                  porneste(async () => {
                    await puneInCamara({
                      produsId: ales.id,
                      cantitate: valoare!,
                      unitate,
                      loc,
                      expiraLa: expiraLa || null,
                    });
                    laInchidere();
                  })
                }
              >
                {seSalveaza ? "Se pune…" : "Pune în cămară"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
