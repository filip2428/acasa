import { notFound } from "next/navigation";

import Antet from "@/componente/Antet";
import { azi, deplaseaza, ziLunga } from "@/lib/formatare";
import { dinCamaraPentru, produsePentruLegat, reteta } from "@/lib/servicii/retete";

import Reteta from "./Reteta";

/** Următoarele șapte zile, scrise cum se vorbește: „azi”, „mâine”, „vineri, 18 septembrie”. */
function urmatoareleZile(ziuaDeAzi = azi()) {
  const zile: { valoare: string; eticheta: string }[] = [];

  for (let i = 0; i < 7; i += 1) {
    const valoare = deplaseaza(ziuaDeAzi, i);
    zile.push({
      valoare,
      eticheta: i === 0 ? "azi" : i === 1 ? "mâine" : ziLunga(valoare),
    });
  }

  return zile;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gasita = await reteta(Number(id));
  return { title: gasita ? `${gasita.titlu} — Acasă` : "Rețetă — Acasă" };
}

export default async function PaginaReteta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numar = Number(id);
  if (!Number.isInteger(numar)) notFound();

  const gasita = await reteta(numar);
  if (!gasita) notFound();

  const [produse, dinCamara] = await Promise.all([
    produsePentruLegat(),
    dinCamaraPentru(numar),
  ]);

  return (
    <main>
      <Antet supratitlu="Rețetă" titlu={gasita.titlu} />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <Reteta
          reteta={gasita}
          produse={produse}
          dinCamara={dinCamara}
          zile={urmatoareleZile()}
        />
      </div>
    </main>
  );
}
