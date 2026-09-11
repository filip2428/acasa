import Link from "next/link";

import BaraCiclului from "@/componente/BaraCiclului";
import type { CicluUrmarit } from "@/lib/servicii/ciclu";
import { CE_PRINDE_BINE, FAZE } from "@/lib/servicii/socoteli-ciclu";

import StareaZilei from "./StareaZilei";

/*
  Ciclul pe ecranul „Azi”: ziua, faza și ce prinde bine, într-un singur card.

  Cardul arată la fel pentru amândoi, cum a hotărât Ralu. În plus, cea care își
  urmărește ciclul are aici și întrebarea de o secundă despre cum se simte.
*/

export default function CardCiclu({
  urmarit,
  esteAlMeu,
  stareaZilei,
}: {
  urmarit: CicluUrmarit;
  esteAlMeu: boolean;
  stareaZilei: { energie: number | null; simptome: string[] } | null;
}) {
  const { stare, nume } = urmarit;
  const faza = stare.faza;

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eticheta">{esteAlMeu ? "Ciclul tău" : `Ciclul lui ${nume}`}</span>
        <Link href="/ciclu" className="text-xs text-[var(--color-creion)] underline">
          {faza ? "vezi tot" : "marchează"}
        </Link>
      </div>

      <p className="titlu mt-1 text-xl">
        {faza ? (
          <>
            Ziua <span className="cifre">{stare.ziuaCiclului}</span> · {FAZE[faza].eticheta}
          </>
        ) : (
          "Nu știm faza"
        )}
      </p>

      {faza && (
        <div className="mt-4">
          <BaraCiclului
            lungime={stare.lungime}
            menstruatie={stare.menstruatie}
            ziuaCiclului={stare.ziuaCiclului}
            mica
          />
        </div>
      )}

      <p className="mt-2 text-sm leading-relaxed text-[var(--color-creion)]">
        {faza
          ? CE_PRINDE_BINE[faza].titlu
          : "A trecut mai mult decât de obicei de la ultima menstruație marcată."}
      </p>

      {esteAlMeu && (
        <div className="mt-4 border-t border-[var(--color-linie)] pt-4">
          <StareaZilei initiala={stareaZilei} />
        </div>
      )}
    </section>
  );
}
