import Link from "next/link";

import Antet from "@/componente/Antet";
import BaraCiclului, { LegendaFazelor } from "@/componente/BaraCiclului";
import { azi, cuDe, ziLunga, zileIntre } from "@/lib/formatare";
import { cicluriPersoanei, cineIsiUrmaresteCiclul, tiparele } from "@/lib/servicii/ciclu";
import { CE_PRINDE_BINE, ETICHETE_NUTRITIE, FAZE } from "@/lib/servicii/socoteli-ciclu";
import { sesiuneCurenta } from "@/lib/sesiune";

import Marcare, { Istoric } from "./Marcare";

export const metadata = { title: "Ciclul — Acasă" };

/*
  Ecranul ciclului.

  Arată ciclul celei care și-l urmărește — pentru amândoi la fel, cum a hotărât
  Ralu —, dar numai ea îl poate marca. Estimările spun mereu din câte cicluri sunt
  socotite, ca să nu pară mai sigure decât sunt.
*/

const LUNI_SCURT = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "noi", "dec"];

function ziScurta(zi: string) {
  const [, luna, ziua] = zi.split("-").map(Number);
  return `${ziua} ${LUNI_SCURT[luna - 1]}`;
}

/** Sub atâtea zile cu răspuns într-o fază, un tipar ar fi o întâmplare. */
const ZILE_PENTRU_TIPAR = 3;

export default async function PaginaCiclu() {
  const sesiune = await sesiuneCurenta();
  const ziuaDeAzi = azi();
  const urmariti = await cineIsiUrmaresteCiclul(ziuaDeAzi);

  const alMeu = urmariti.find((u) => u.persoanaId === sesiune?.persoanaId);
  const afisat = alMeu ?? urmariti[0] ?? null;
  const potMarca = !afisat || afisat.persoanaId === sesiune?.persoanaId;

  const [istoric, tipare] = afisat
    ? await Promise.all([cicluriPersoanei(afisat.persoanaId), tiparele(afisat.persoanaId, ziuaDeAzi)])
    : [[], []];

  const stare = afisat?.stare ?? null;
  const faza = stare?.faza ?? null;
  const ceAjuta = faza ? CE_PRINDE_BINE[faza] : null;
  const etichetaRetete = ceAjuta?.etichete[0]
    ? ETICHETE_NUTRITIE.find((e) => e.valoare === ceAjuta.etichete[0])
    : undefined;

  const inCurs =
    faza === "menstruala" && stare != null && !stare.terminataCurent;

  const cicluriAfisate = [...istoric].reverse().slice(0, 8).map((c) => {
    const urmator = istoric.find((x) => x.inceput > c.inceput);
    const lungime = urmator ? zileIntre(c.inceput, urmator.inceput) : null;
    const durata = c.sfarsit ? zileIntre(c.inceput, c.sfarsit) + 1 : null;
    return {
      id: c.id,
      inceput: c.inceput,
      text: ziScurta(c.inceput),
      detalii: [
        lungime ? `${lungime} zile` : "în curs",
        durata ? `menstruație ${durata}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  });

  const cuTipar = tipare.filter((t) => t.zile >= ZILE_PENTRU_TIPAR);

  return (
    <main>
      <Antet
        supratitlu={!afisat ? "Ciclul" : alMeu ? "Ciclul tău" : `Ciclul lui ${afisat.nume}`}
        titlu={
          !afisat
            ? "Nimic marcat încă"
            : faza
              ? `Ziua ${stare!.ziuaCiclului} · ${FAZE[faza].eticheta}`
              : "Nu știm faza"
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        {!afisat ? (
          <section className="card p-4">
            <p className="text-[0.9375rem] leading-relaxed">
              Marchezi ziua în care începe menstruația. Din ciclurile tale, aplicația
              socotește faza, pune în față rețete potrivite și sare peste treburile grele în
              zilele cu menstruație.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-creion)]">
              Ce marchezi se vede și de celălalt din casă.
            </p>
            <div className="mt-4">
              <Marcare inCurs={false} ziuaDeAzi={ziuaDeAzi} />
            </div>
          </section>
        ) : (
          <section className="card p-4">
            <div className="pt-3">
              <BaraCiclului
                lungime={stare!.lungime}
                menstruatie={stare!.menstruatie}
                ziuaCiclului={faza ? stare!.ziuaCiclului : null}
              />
            </div>
            <div className="mt-3">
              <LegendaFazelor />
            </div>

            <p className="mt-4 text-[0.9375rem] leading-relaxed">
              {faza && stare!.urmatoareaLa ? (
                stare!.zilePanaLaUrmatoarea! > 0 ? (
                  <>
                    Următoarea, cam pe <strong>{ziLunga(stare!.urmatoareaLa)}</strong>.
                  </>
                ) : (
                  <>Următoarea ar fi cam pe acum.</>
                )
              ) : (
                <>
                  Au trecut {cuDe(stare!.ziuaCiclului ?? 0, "zile")} de la ultima menstruație
                  marcată, mai mult decât de obicei. Dacă a început între timp, marchează ziua.
                </>
              )}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-creion)]">
              {stare!.dinCicluri === 0
                ? "Până se adună un ciclu întreg, socotim cu 28 de zile."
                : `Socotit din ${stare!.dinCicluri === 1 ? "ultimul ciclu" : `ultimele ${stare!.dinCicluri} cicluri`}: în medie ${stare!.lungime} de zile.`}
            </p>

            {potMarca && (
              <div className="mt-4 border-t border-[var(--color-linie)] pt-4">
                <Marcare inCurs={inCurs} ziuaDeAzi={ziuaDeAzi} />
              </div>
            )}
          </section>
        )}

        {ceAjuta && (
          <section className="card p-4">
            <span className="eticheta">Ce prinde bine acum</span>
            <p className="titlu mt-1 text-xl">{ceAjuta.titlu}</p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
              {ceAjuta.text}
            </p>
            {etichetaRetete && (
              <Link
                href={`/mese/retete?eticheta=${encodeURIComponent(etichetaRetete.valoare)}`}
                className="buton buton-secundar buton-mic mt-3 w-full"
              >
                Rețete: {etichetaRetete.eticheta.toLowerCase()}
              </Link>
            )}
          </section>
        )}

        {afisat && (cuTipar.length > 0 || potMarca) && (
          <section>
            <h2 className="eticheta mb-1.5 px-1">Tiparele tale</h2>
            {cuTipar.length === 0 ? (
              <p className="card p-4 text-sm leading-relaxed text-[var(--color-creion)]">
                După câteva zile în care răspunzi la „cum te simți azi” pe ecranul Azi, aici
                apare cum îți e energia în fiecare fază și ce simptome se repetă.
              </p>
            ) : (
              <ul className="card card-lipit overflow-hidden">
                {cuTipar.map((t) => (
                  <li key={t.faza} className="px-3.5 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2 text-[0.9375rem]">
                        <span
                          aria-hidden
                          className="block size-2.5 rounded-full"
                          style={{ backgroundColor: FAZE[t.faza].culoare }}
                        />
                        {FAZE[t.faza].eticheta}
                      </span>
                      {t.energieMedie != null && (
                        <span className="text-xs text-[var(--color-creion)]">
                          energie{" "}
                          <span className="cifre">{String(t.energieMedie).replace(".", ",")}</span>{" "}
                          din 5
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-creion)]">
                      {t.simptome.length > 0
                        ? t.simptome.map((s) => s.nume).join(", ")
                        : "fără simptome bifate"}
                      {` · din ${cuDe(t.zile, "zile")}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {cicluriAfisate.length > 0 && (
          <section>
            <h2 className="eticheta mb-1.5 px-1">Ciclurile marcate</h2>
            <Istoric cicluri={cicluriAfisate} potScoate={potMarca} />
          </section>
        )}

        <p className="px-1 pb-2 text-xs leading-relaxed text-[var(--color-creion)]">
          Sunt estimări, nu sfaturi medicale. La cicluri foarte neregulate sau dureri mari,
          medicul e cel care știe.
        </p>
      </div>
    </main>
  );
}
