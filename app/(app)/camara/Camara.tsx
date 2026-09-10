"use client";

import { useMemo, useState, useTransition } from "react";

import { azi, cantitate as scrieCantitatea } from "@/lib/formatare";
import { LOCURI, type RandStoc } from "@/lib/domeniu";

import { propuneExpirarea, puneInCamara, schimbaCat, scoateDinCamara } from "./actiuni";

/*
  Cămara.

  Ecranul are o singură prioritate: ce expiră curând urcă în capul listei,
  indiferent unde stă. Restul e grupat pe locuri.
*/

type ProdusDisponibil = {
  id: number;
  nume: string;
  unitate: string;
  cantitateImplicita: number;
  zileValabilitate: number | null;
  esteInCamara: boolean;
};

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

function Rand({ rand, porneste }: { rand: RandStoc; porneste: (a: () => void) => void }) {
  const [deschis, setDeschis] = useState(false);
  const zile = rand.zilePanaLaExpirare;

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
            {scrieCantitatea(rand.cantitate, rand.unitate)}
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
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Mai puțin"
              onClick={() => porneste(() => schimbaCat(rand.id, rand.cantitate - 1))}
              className="flex size-9 items-center justify-center rounded-lg border border-[var(--color-linie)] bg-white"
            >
              −
            </button>
            <span className="cifre w-12 text-center text-sm">{rand.cantitate}</span>
            <button
              type="button"
              aria-label="Mai mult"
              onClick={() => porneste(() => schimbaCat(rand.id, rand.cantitate + 1))}
              className="flex size-9 items-center justify-center rounded-lg border border-[var(--color-linie)] bg-white"
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="buton buton-mic buton-secundar ml-auto"
            onClick={() => porneste(() => scoateDinCamara(rand.id))}
          >
            S-a terminat
          </button>
        </div>
      )}
    </li>
  );
}

function textExpirare(zile: number) {
  if (zile < 0) return `a expirat acum ${Math.abs(zile)} ${Math.abs(zile) === 1 ? "zi" : "zile"}`;
  if (zile === 0) return "expiră azi";
  if (zile === 1) return "expiră mâine";
  return `mai are ${zile} zile`;
}

function FisaAdaugare({
  produse,
  laInchidere,
}: {
  produse: ProdusDisponibil[];
  laInchidere: () => void;
}) {
  const [termen, setTermen] = useState("");
  const [ales, setAles] = useState<ProdusDisponibil | null>(null);
  const [cantitate, setCantitate] = useState(1);
  const [loc, setLoc] = useState("camara");
  const [expiraLa, setExpiraLa] = useState<string>("");
  const [seSalveaza, porneste] = useTransition();

  const gasite = useMemo(() => {
    const curat = termen.trim().toLowerCase();
    if (!curat) return produse.slice(0, 8);
    return produse.filter((p) => p.nume.toLowerCase().includes(curat)).slice(0, 8);
  }, [produse, termen]);

  function alege(produs: ProdusDisponibil) {
    setAles(produs);
    setCantitate(produs.cantitateImplicita);
    porneste(async () => {
      const propusa = await propuneExpirarea(produs.id);
      setExpiraLa(propusa ?? "");
    });
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

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label>
                <span className="eticheta">Cât</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0.25"
                  value={cantitate}
                  onChange={(e) => setCantitate(Number(e.target.value))}
                  className="camp cifre mt-1"
                />
              </label>

              <label>
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
            </div>

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
                disabled={seSalveaza}
                onClick={() =>
                  porneste(async () => {
                    await puneInCamara({
                      produsId: ales.id,
                      cantitate,
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
