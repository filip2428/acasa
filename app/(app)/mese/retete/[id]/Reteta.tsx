"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { RetetaAfisata, StareIngredient } from "@/lib/domeniu";
import { MOMENTE } from "@/lib/domeniu";
import { candFataDeAzi, cantitate as scrieCantitatea, cuDe } from "@/lib/formatare";
import { desparteCantitatea } from "@/lib/servicii/socoteli-meniu";

import {
  adauga,
  amGatit,
  comutaSteluta,
  leaga,
  pune,
  sAterminat,
  scoateIngredientul,
  sterge,
  treciPeLista,
} from "../../actiuni";
import FisaReteta from "../FisaReteta";

/*
  O rețetă.

  Partea care contează cu adevărat e coloana din dreapta ingredientelor: „ai”,
  „lipsă”, „mereu în casă”, „neștiut”. Din ea ies toate celelalte lucruri —
  propunerea de meniu, lista de cumpărături, prețul lipsurilor. Un ingredient
  neștiut se leagă de catalog cu un tap, iar rețeta devine mai deșteaptă.
*/

type Produs = { id: number; nume: string; unitate: string; mereuInCasa: boolean };
type RandCamara = { id: number; nume: string; cantitate: number; unitate: string; loc: string };

const CULORI_STARE: Record<StareIngredient, string> = {
  ai: "fisa",
  mereu: "fisa",
  lipsa: "fisa fisa-caramida",
  nestiut: "fisa",
};

const TEXT_STARE: Record<StareIngredient, string> = {
  ai: "ai",
  mereu: "mereu",
  lipsa: "lipsă",
  nestiut: "leagă-l",
};

export default function Reteta({
  reteta,
  produse,
  dinCamara,
  zile,
}: {
  reteta: RetetaAfisata;
  produse: Produs[];
  dinCamara: RandCamara[];
  zile: { valoare: string; eticheta: string }[];
}) {
  const [deLegat, setDeLegat] = useState<number | null>(null);
  const [planul, setPlanul] = useState(false);
  const [editare, setEditare] = useState(false);
  const [dupaGatit, setDupaGatit] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [lucreaza, porneste] = useTransition();
  const router = useRouter();

  const lipsuri = reteta.ingrediente.filter((i) => i.stare === "lipsa" && i.produsId);

  return (
    <>
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-relaxed text-[var(--color-creion)]">
            {[
              `${reteta.portii} porții`,
              reteta.minuteTotal ? cuDe(reteta.minuteTotal, "minute") : null,
              reteta.laTm6 ? "la Thermomix" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <button
            type="button"
            aria-pressed={reteta.favorit}
            aria-label={reteta.favorit ? "Scoate de la favorite" : "Pune la favorite"}
            onClick={() => porneste(() => comutaSteluta(reteta.id))}
            className={`shrink-0 text-xl leading-none ${
              reteta.favorit ? "text-[var(--color-alama)]" : "text-[var(--color-linie)]"
            }`}
          >
            ★
          </button>
        </div>

        {reteta.url && (
          <a
            href={reteta.url}
            target="_blank"
            rel="noreferrer"
            className="buton buton-secundar buton-mic mt-3 w-full"
          >
            {reteta.sursa === "cookidoo" ? "Deschide în Cookidoo" : "Deschide rețeta"}
          </a>
        )}

        {reteta.ultimaGatireLa && (
          <p className="mt-3 text-xs text-[var(--color-creion)]">
            Gătită ultima dată {candFataDeAzi(reteta.ultimaGatireLa)}.
          </p>
        )}
      </section>

      <section>
        <div className="mb-1.5 flex items-baseline justify-between px-1">
          <h2 className="eticheta">Ingrediente</h2>
          {reteta.dinTotal > 0 && (
            <span className="text-xs text-[var(--color-creion)]">
              ai {reteta.ai} din {reteta.dinTotal}
            </span>
          )}
        </div>

        <ul className="card card-lipit overflow-hidden">
          {reteta.ingrediente.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem]">{i.textOriginal}</span>
                {i.produsId && i.nume !== i.textOriginal && (
                  <span className="text-xs text-[var(--color-creion)]">
                    {i.nume}
                    {i.zilePanaLaExpirare != null && i.zilePanaLaExpirare <= 3
                      ? i.zilePanaLaExpirare <= 0
                        ? " · a expirat"
                        : ` · mai are ${i.zilePanaLaExpirare} zile`
                      : ""}
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => setDeLegat(i.id)}
                className={`${CULORI_STARE[i.stare]} shrink-0`}
              >
                {i.stare === "ai" && i.zilePanaLaExpirare != null && i.zilePanaLaExpirare <= 3
                  ? "expiră"
                  : TEXT_STARE[i.stare]}
              </button>

              <button
                type="button"
                aria-label={`Scoate ${i.textOriginal}`}
                onClick={() => porneste(() => scoateIngredientul(reteta.id, i.id))}
                className="shrink-0 text-[var(--color-creion)]"
              >
                ×
              </button>
            </li>
          ))}

          <li className="p-2">
            <CampIngredient retetaId={reteta.id} produse={produse} />
          </li>
        </ul>
      </section>

      {reteta.instructiuni && (
        <section className="card p-4">
          <h2 className="eticheta">Cum se face</h2>
          <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
            {reteta.instructiuni}
          </p>
        </section>
      )}

      {mesaj && (
        <p className="rounded-xl bg-[var(--color-smalt-palid)] p-3 text-sm text-[var(--color-smalt-adanc)]">
          {mesaj}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="buton buton-secundar"
          onClick={() => setPlanul(true)}
        >
          Pune în plan
        </button>
        <button
          type="button"
          className="buton buton-principal"
          disabled={lucreaza}
          onClick={() =>
            porneste(async () => {
              await amGatit(reteta.id);
              setDupaGatit(true);
            })
          }
        >
          Am gătit-o
        </button>
      </div>

      {lipsuri.length > 0 && (
        <button
          type="button"
          className="buton buton-secundar w-full"
          disabled={lucreaza}
          onClick={() =>
            porneste(async () => {
              setMesaj(await treciPeLista(lipsuri.map((i) => i.produsId!)));
            })
          }
        >
          Pune lipsurile pe listă ({lipsuri.length})
        </button>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          className="buton buton-secundar buton-mic flex-1"
          onClick={() => setEditare(true)}
        >
          Editează
        </button>
        <button
          type="button"
          className="buton buton-secundar buton-mic buton-sters flex-1"
          disabled={lucreaza}
          onClick={() =>
            porneste(async () => {
              await sterge(reteta.id);
              router.push("/mese/retete");
            })
          }
        >
          Șterge rețeta
        </button>
      </div>

      {deLegat != null && (
        <AlegeProdusul
          produse={produse}
          laAlegere={(produsId) =>
            porneste(async () => {
              await leaga(reteta.id, deLegat, produsId);
              setDeLegat(null);
            })
          }
          laInchidere={() => setDeLegat(null)}
        />
      )}

      {planul && (
        <PuneInPlan
          zile={zile}
          laAlegere={(data, moment) =>
            porneste(async () => {
              await pune(data, moment, reteta.id);
              setPlanul(false);
              setMesaj("Am pus-o în plan.");
            })
          }
          laInchidere={() => setPlanul(false)}
        />
      )}

      {dupaGatit && (
        <DupaGatit
          retetaId={reteta.id}
          randuri={dinCamara}
          laInchidere={() => setDupaGatit(false)}
        />
      )}

      {editare && (
        <FisaReteta
          date={{
            id: reteta.id,
            titlu: reteta.titlu,
            portii: reteta.portii,
            minuteTotal: reteta.minuteTotal,
            laTm6: reteta.laTm6,
            efort: reteta.efort,
            url: reteta.url,
            instructiuni: reteta.instructiuni,
            etichete: reteta.etichete,
          }}
          laInchidere={() => setEditare(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------ adăugat ingrediente */

function CampIngredient({ retetaId, produse }: { retetaId: number; produse: Produs[] }) {
  const [text, setText] = useState("");
  const [, porneste] = useTransition();

  function trimite() {
    const curat = text.trim();
    if (!curat) return;

    // „500 g piept de pui” → cantitate, unitate și un nume pe care îl putem căuta
    // în catalog. Dacă îl găsim, ingredientul se leagă singur — asta e ce face
    // diferența între o listă de cuvinte și o rețetă care știe dacă o poți găti.
    const { cantitate, unitate, nume } = desparteCantitatea(curat);
    const potrivit = produse.find(
      (p) =>
        p.nume.toLowerCase() === nume.toLowerCase() ||
        p.nume.toLowerCase().startsWith(nume.toLowerCase()),
    );

    setText("");
    porneste(() =>
      adauga(retetaId, {
        textOriginal: curat,
        produsId: potrivit?.id ?? null,
        cantitate,
        unitate: unitate ?? potrivit?.unitate ?? null,
      }),
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            trimite();
          }
        }}
        className="camp"
        placeholder="500 g piept de pui"
        aria-label="Adaugă un ingredient"
      />
      <button type="button" className="buton buton-principal shrink-0" onClick={trimite}>
        Pune
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- alegeri */

function Foaie({
  titlu,
  laInchidere,
  children,
}: {
  titlu: string;
  laInchidere: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Închide"
        onClick={laInchidere}
        className="absolute inset-0 bg-black/35"
      />
      <section
        className="intra relative max-h-[85dvh] overflow-y-auto rounded-t-[1.5rem] bg-[var(--color-chit)] p-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-linie)]" />
        <h2 className="eticheta">{titlu}</h2>
        {children}
      </section>
    </div>
  );
}

function AlegeProdusul({
  produse,
  laAlegere,
  laInchidere,
}: {
  produse: Produs[];
  laAlegere: (produsId: number | null) => void;
  laInchidere: () => void;
}) {
  const [termen, setTermen] = useState("");

  const gasite = useMemo(() => {
    const curat = termen.trim().toLowerCase();
    const toate = curat ? produse.filter((p) => p.nume.toLowerCase().includes(curat)) : produse;
    return toate.slice(0, 30);
  }, [produse, termen]);

  return (
    <Foaie titlu="Leagă de un produs din catalog" laInchidere={laInchidere}>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-creion)]">
        De aici încolo știm dacă îl ai în casă, cât costă și când expiră.
      </p>

      <input
        value={termen}
        onChange={(e) => setTermen(e.target.value)}
        className="camp mt-3"
        type="search"
        placeholder="Caută în catalog…"
        aria-label="Caută în catalog"
        autoFocus
      />

      <ul className="card card-lipit mt-3 overflow-hidden">
        {gasite.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => laAlegere(p.id)}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{p.nume}</span>
              {p.mereuInCasa && <span className="fisa shrink-0">mereu în casă</span>}
            </button>
          </li>
        ))}
        {gasite.length === 0 && (
          <li className="px-3.5 py-3 text-sm text-[var(--color-creion)]">
            Nu e în catalog. Adaugă-l întâi din Listă → Catalog.
          </li>
        )}
      </ul>

      <button
        type="button"
        className="buton buton-secundar buton-sters mt-3 w-full"
        onClick={() => laAlegere(null)}
      >
        Lasă-l nelegat
      </button>
    </Foaie>
  );
}

function PuneInPlan({
  zile,
  laAlegere,
  laInchidere,
}: {
  zile: { valoare: string; eticheta: string }[];
  laAlegere: (data: string, moment: string) => void;
  laInchidere: () => void;
}) {
  const [moment, setMoment] = useState("cina");

  return (
    <Foaie titlu="Când o facem" laInchidere={laInchidere}>
      <div className="mt-2 flex gap-2">
        {MOMENTE.map((m) => (
          <button
            key={m.valoare}
            type="button"
            onClick={() => setMoment(m.valoare)}
            aria-pressed={moment === m.valoare}
            className={`buton buton-mic flex-1 ${
              moment === m.valoare ? "buton-principal" : "buton-secundar"
            }`}
          >
            {m.eticheta}
          </button>
        ))}
      </div>

      <ul className="card card-lipit mt-3 overflow-hidden">
        {zile.map((zi) => (
          <li key={zi.valoare}>
            <button
              type="button"
              onClick={() => laAlegere(zi.valoare, moment)}
              className="w-full px-3.5 py-3 text-left text-[0.9375rem]"
            >
              {zi.eticheta}
            </button>
          </li>
        ))}
      </ul>
    </Foaie>
  );
}

function DupaGatit({
  retetaId,
  randuri,
  laInchidere,
}: {
  retetaId: number;
  randuri: RandCamara[];
  laInchidere: () => void;
}) {
  const [scoase, setScoase] = useState<number[]>([]);
  const [, porneste] = useTransition();

  return (
    <Foaie titlu="S-a terminat ceva?" laInchidere={laInchidere}>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-creion)]">
        Am trecut-o la gătite. Nu socotim noi cât s-a consumat — spune tu ce s-a
        terminat de tot și scoatem din cămară.
      </p>

      {randuri.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-creion)]">
          Nimic din rețeta asta nu e în cămară.
        </p>
      ) : (
        <ul className="card card-lipit mt-3 overflow-hidden">
          {randuri
            .filter((r) => !scoase.includes(r.id))
            .map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem]">{r.nume}</span>
                  <span className="text-xs text-[var(--color-creion)]">
                    {scrieCantitatea(r.cantitate, r.unitate)}
                  </span>
                </span>
                <button
                  type="button"
                  className="buton buton-mic buton-secundar shrink-0"
                  onClick={() =>
                    porneste(async () => {
                      setScoase((s) => [...s, r.id]);
                      await sAterminat(retetaId, r.id);
                    })
                  }
                >
                  S-a terminat
                </button>
              </li>
            ))}
        </ul>
      )}

      <button type="button" className="buton buton-principal mt-4 w-full" onClick={laInchidere}>
        Gata
      </button>
    </Foaie>
  );
}
