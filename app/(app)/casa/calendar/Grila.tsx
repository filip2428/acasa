"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { bifeazaTreaba } from "../../actiuni";
import type { DateEveniment, EvenimentAfisat, IntrareZi, ZiDinCalendar } from "@/lib/domeniu";
import { lunaInCuvinte, lunaVecina, ziLunga } from "@/lib/formatare";

import Fisa, { evenimentNou, type CalendarPersoana } from "./Fisa";

/*
  Luna, ca un calendar adevărat.

  Într-o grilă intră trei feluri de lucruri care altfel n-ar sta niciodată
  împreună: scadențele casei, ritmul treburilor și ce are fiecare în calendarul
  lui. Codificarea e făcută să se citească dintr-o privire, pe telefon:

    · punct verde  — ceva al casei (ITP, revizie, control)
    · punct alamă  — o treabă care pică atunci
    · dungă sub zi — cineva e ocupat; culoarea spune cine

  Zilele fără nimic rămân goale, și asta e jumătate din informație: acolo încape
  ceva.
*/

const ZILE_SCURT = ["L", "M", "M", "J", "V", "S", "D"];

type Om = { id: number; nume: string; culoare: string; areCalendar: boolean };

export default function Grila({
  luna,
  zile,
  evenimente,
  oameni,
  calendare,
  probleme,
  ziuaInitiala,
  ziuaDeAzi,
}: {
  luna: string;
  zile: ZiDinCalendar[];
  evenimente: EvenimentAfisat[];
  oameni: Om[];
  calendare: CalendarPersoana[];
  probleme: { nume: string; eroare: string }[];
  ziuaInitiala: string;
  ziuaDeAzi: string;
}) {
  const [aleasa, setAleasa] = useState(ziuaInitiala);
  const [fisa, setFisa] = useState<DateEveniment | null>(null);

  const ziua = zile.find((z) => z.ziua === aleasa) ?? zile.find((z) => !z.altaLuna)!;
  const culoarea = (persoanaId: number) =>
    oameni.find((o) => o.id === persoanaId)?.culoare ?? "var(--color-creion)";

  function deschide(id: number) {
    const e = evenimente.find((x) => x.id === id);
    if (!e) return;
    setFisa({
      id: e.id,
      titlu: e.titlu,
      categorie: e.categorie,
      data: e.scadenta,
      recurentaLuni: e.recurentaLuni,
      remindereZileInainte: e.remindereZileInainte,
      notite: e.notite,
      googleCalendarId: e.googleCalendarId,
    });
  }

  return (
    <>
      <section className="card overflow-hidden p-3">
        <header className="flex items-center justify-between gap-2 px-1">
          <h2 className="titlu text-xl">{lunaInCuvinte(luna)}</h2>
          <nav className="flex items-center gap-1">
            <Sageata luna={lunaVecina(luna, -1)} eticheta="Luna trecută">
              ‹
            </Sageata>
            <Sageata luna={lunaVecina(luna, 1)} eticheta="Luna viitoare">
              ›
            </Sageata>
          </nav>
        </header>

        <div className="mt-3 grid grid-cols-7 gap-y-1">
          {ZILE_SCURT.map((zi, i) => (
            <span key={i} className="eticheta text-center">
              {zi}
            </span>
          ))}

          {zile.map((zi) => (
            <Zi
              key={zi.ziua}
              zi={zi}
              aleasa={zi.ziua === ziua.ziua}
              oameni={oameni}
              onClick={() => setAleasa(zi.ziua)}
            />
          ))}
        </div>

        <Legenda oameni={oameni} />
      </section>

      {probleme.map((p) => (
        <p
          key={p.nume}
          className="rounded-xl bg-[var(--color-caramida-palid)] p-3 text-sm leading-relaxed text-[#8c3626]"
        >
          Calendarul lui {p.nume} nu se citește. {p.eroare}{" "}
          <Link href="/setari" className="underline">
            Vezi în Setări
          </Link>
        </p>
      ))}

      <ZiuaAleasa
        zi={ziua}
        ziuaDeAzi={ziuaDeAzi}
        culoarea={culoarea}
        laEveniment={deschide}
        laAdaugare={() => setFisa(evenimentNou(ziua.ziua))}
      />

      {fisa && (
        <Fisa date={fisa} calendare={calendare} laInchidere={() => setFisa(null)} />
      )}
    </>
  );
}

function Sageata({
  luna,
  eticheta,
  children,
}: {
  luna: string;
  eticheta: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/casa/calendar?luna=${luna}`}
      scroll={false}
      aria-label={eticheta}
      className="flex size-9 items-center justify-center rounded-lg border border-[var(--color-linie)] text-lg leading-none"
    >
      {children}
    </Link>
  );
}

function Zi({
  zi,
  aleasa,
  oameni,
  onClick,
}: {
  zi: ZiDinCalendar;
  aleasa: boolean;
  oameni: Om[];
  onClick: () => void;
}) {
  const areEveniment = zi.intrari.some((i) => i.fel === "eveniment");
  const areTreaba = zi.intrari.some((i) => i.fel === "treaba");
  const ocupati = oameni.filter((o) =>
    zi.intrari.some((i) => i.fel === "google" && i.persoanaId === o.id),
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aleasa}
      aria-label={`${zi.numar}, ${zi.intrari.length} lucruri`}
      className="flex h-14 flex-col items-center justify-start pt-1"
    >
      <span
        className={`flex size-7 items-center justify-center rounded-full text-sm ${
          aleasa
            ? "bg-[var(--color-smalt)] font-semibold text-[var(--color-portelan)]"
            : zi.esteAzi
              ? "font-semibold text-[var(--color-alama)] ring-1 ring-[var(--color-alama)]"
              : zi.altaLuna
                ? "text-[var(--color-linie)]"
                : "text-[var(--color-cerneala)]"
        }`}
      >
        <span className="cifre">{zi.numar}</span>
      </span>

      <span className="mt-1 flex h-1.5 items-center gap-0.5">
        {areEveniment && (
          <span className="size-1.5 rounded-full bg-[var(--color-smalt)]" />
        )}
        {areTreaba && <span className="size-1.5 rounded-full bg-[var(--color-alama)]" />}
      </span>

      <span className="mt-0.5 flex flex-col gap-px">
        {ocupati.map((o) => (
          <span
            key={o.id}
            className="block h-0.5 w-5 rounded-full"
            style={{ backgroundColor: o.culoare }}
          />
        ))}
      </span>
    </button>
  );
}

function Legenda({ oameni }: { oameni: Om[] }) {
  const cuCalendar = oameni.filter((o) => o.areCalendar);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--color-linie)] px-1 pt-2">
      <Semn culoare="var(--color-smalt)" nume="Casa" />
      <Semn culoare="var(--color-alama)" nume="Treburi" />
      {cuCalendar.map((o) => (
        <Semn key={o.id} culoare={o.culoare} nume={o.nume} dunga />
      ))}
    </div>
  );
}

function Semn({ culoare, nume, dunga }: { culoare: string; nume: string; dunga?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--color-creion)]">
      <span
        className={dunga ? "block h-0.5 w-3.5 rounded-full" : "block size-1.5 rounded-full"}
        style={{ backgroundColor: culoare }}
      />
      {nume}
    </span>
  );
}

/* ------------------------------------------------------------- ziua aleasă */

function ZiuaAleasa({
  zi,
  ziuaDeAzi,
  culoarea,
  laEveniment,
  laAdaugare,
}: {
  zi: ZiDinCalendar;
  ziuaDeAzi: string;
  culoarea: (persoanaId: number) => string;
  laEveniment: (id: number) => void;
  laAdaugare: () => void;
}) {
  return (
    <section>
      <h2 className="eticheta mb-1.5 px-1">
        {zi.ziua === ziuaDeAzi ? "Azi" : ziLunga(zi.ziua)}
      </h2>

      {zi.intrari.length === 0 ? (
        <p className="card p-4 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
          Nimic în ziua asta.
        </p>
      ) : (
        <ul className="card card-lipit overflow-hidden">
          {zi.intrari.map((intrare) => (
            <Intrare
              key={cheia(intrare)}
              intrare={intrare}
              potFiBifate={zi.ziua <= ziuaDeAzi}
              culoarea={culoarea}
              laEveniment={laEveniment}
            />
          ))}
        </ul>
      )}

      <button type="button" className="buton buton-principal mt-3 w-full" onClick={laAdaugare}>
        Adaugă în ziua asta
      </button>
    </section>
  );
}

const cheia = (i: IntrareZi) => `${i.fel}:${i.id}`;

function Intrare({
  intrare,
  potFiBifate,
  culoarea,
  laEveniment,
}: {
  intrare: IntrareZi;
  potFiBifate: boolean;
  culoarea: (persoanaId: number) => string;
  laEveniment: (id: number) => void;
}) {
  const [facut, setFacut] = useState(false);
  const [, porneste] = useTransition();

  if (intrare.fel === "google") {
    return (
      <li className="flex items-center gap-3 px-3.5 py-2.5">
        <span
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: culoarea(intrare.persoanaId) }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem]">{intrare.titlu}</span>
          <span className="text-xs text-[var(--color-creion)]">
            {intrare.persoana}
            {intrare.ora
              ? ` · ${intrare.ora}${intrare.oraSfarsit ? `–${intrare.oraSfarsit}` : ""}`
              : " · toată ziua"}
          </span>
        </span>
      </li>
    );
  }

  if (intrare.fel === "eveniment") {
    return (
      <li>
        <button
          type="button"
          onClick={() => laEveniment(intrare.id)}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-smalt)]" />
          <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{intrare.titlu}</span>
          {intrare.intarziat && <span className="fisa fisa-caramida shrink-0">a trecut</span>}
        </button>
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-3 px-3.5 py-2.5 ${facut ? "opacity-45" : ""}`}>
      {potFiBifate ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={facut}
          aria-label={`Marchează ca făcut: ${intrare.titlu}`}
          onClick={() =>
            porneste(async () => {
              setFacut(true);
              await bifeazaTreaba(intrare.id);
            })
          }
          className="size-[1.375rem] shrink-0 rounded-full border-2 border-[var(--color-linie)]"
        />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-alama)]" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem]">{intrare.titlu}</span>
        <span className="text-xs text-[var(--color-creion)]">
          {intrare.zona} · {intrare.minute} min
        </span>
      </span>
      {intrare.intarziat && !facut && (
        <span className="fisa fisa-caramida shrink-0">restant</span>
      )}
    </li>
  );
}
