import Antet from "@/componente/Antet";
import { candFataDeAzi, lei, lunaCurenta } from "@/lib/formatare";
import {
  bugetulLunii,
  cheltuieliNetrimise,
  cheltuieliRecente,
  ultimaCitire,
  verificaFoaia,
} from "@/lib/servicii/buget";
import { areGoogle } from "@/lib/servicii/google";

import FormularCheltuiala from "./FormularCheltuiala";
import Netrimise from "./Netrimise";
import Reimprospateaza from "./Reimprospateaza";

export const metadata = { title: "Bani — Acasă" };

export default async function PaginaBani() {
  const conectat = areGoogle();
  const [bugetCitit, recente, netrimise] = await Promise.all([
    conectat ? bugetulLunii() : Promise.resolve([]),
    cheltuieliRecente(12),
    cheltuieliNetrimise(),
  ]);

  // Gol deși e legat înseamnă aproape sigur că citirea din Google a picat. Aflăm
  // de ce, ca ecranul să spună ce e de reparat în loc să tacă.
  const stareaFoii = conectat && bugetCitit.length === 0 ? await verificaFoaia() : null;
  const buget = stareaFoii?.ok ? await bugetulLunii() : bugetCitit;

  const cititLa = buget.length > 0 ? await ultimaCitire() : null;
  const minute = cititLa ? Math.max(0, Math.round((Date.now() / 1000 - cititLa) / 60)) : null;
  const eticheta =
    minute == null ? undefined : minute < 1 ? "citit acum" : `citit acum ${minute} min`;

  const categorii = buget.map((r) => r.categorie);
  const cuPlan = buget.filter((r) => r.planificat > 0 || r.real > 0);
  const totalPlanificat = buget.reduce((t, r) => t + r.planificat, 0);
  const totalReal = buget.reduce((t, r) => t + r.real, 0);

  return (
    <main>
      <Antet
        supratitlu={`Bugetul lunii ${lunaCurenta()}`}
        titlu={totalPlanificat > 0 ? `${lei(totalPlanificat - totalReal, true)} rămân` : "Bani"}
        dreapta={
          totalReal > 0 ? (
            <span className="cifre text-sm text-white/70">{lei(totalReal, true)} dat</span>
          ) : null
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        {!conectat ? (
          <section className="card intra p-4">
            <h2 className="titlu text-lg">Nu e legat de buget</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
              Ca să pot citi și scrie în Buget_Familial, îmi trebuie contul de serviciu
              Google. Pașii sunt în README, iar apoi{" "}
              <code className="cifre">npm run google -- fișierul.json</code> face restul.
            </p>
          </section>
        ) : (
          <FormularCheltuiala
            categorii={categorii}
            ultimaCategorie={recente[0]?.categorie ?? null}
          />
        )}

        {stareaFoii && !stareaFoii.ok && (
          <section className="card p-4">
            <h2 className="titlu text-lg">Nu pot citi foaia de buget</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
              {stareaFoii.motiv}
            </p>
            <div className="mt-3">
              <Reimprospateaza />
            </div>
          </section>
        )}

        {netrimise.length > 0 && <Netrimise cate={netrimise.length} />}

        {recente.length > 0 && (
          <section>
            <h2 className="eticheta mb-1.5 px-1">Trecute din aplicație</h2>
            <ul className="card card-lipit overflow-hidden">
              {recente.map((t) => (
                <li key={t.id} className="flex items-baseline gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem]">{t.categorie}</span>
                    <span className="text-xs text-[var(--color-creion)]">
                      {candFataDeAzi(t.data)}
                      {t.descriere ? ` · ${t.descriere}` : ""}
                      {t.sursa === "lista" ? " · din listă" : ""}
                      {t.sursa === "bon" ? " · de pe bon" : ""}
                    </span>
                  </span>
                  {!t.trimisLa && <span className="fisa fisa-caramida shrink-0">netrimis</span>}
                  <span className="cifre shrink-0 text-sm">{lei(t.suma)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {cuPlan.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
              <h2 className="eticheta">Toate categoriile</h2>
              <Reimprospateaza eticheta={eticheta} mic />
            </div>
            <ul className="card space-y-3 p-4">
              {cuPlan.map((rand) => {
                const procent =
                  rand.planificat > 0
                    ? Math.min(100, Math.round((rand.real / rand.planificat) * 100))
                    : 100;
                return (
                  <li key={rand.categorie}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm">{rand.categorie}</span>
                      <span
                        className={`cifre shrink-0 text-sm ${
                          rand.ramas < 0
                            ? "text-[var(--color-caramida)]"
                            : "text-[var(--color-creion)]"
                        }`}
                      >
                        {rand.ramas < 0
                          ? `${lei(Math.abs(rand.ramas), true)} peste`
                          : `${lei(rand.ramas, true)} rămân`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-chit)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${procent}%`,
                          backgroundColor:
                            rand.ramas < 0
                              ? "var(--color-caramida)"
                              : "var(--color-smalt-viu)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
