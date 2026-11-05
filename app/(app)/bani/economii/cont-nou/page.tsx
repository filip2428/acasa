import Antet from "@/componente/Antet";
import { azi } from "@/lib/formatare";
import { areScadenta, contPeEcran, esteInvestitie, fonduriDinLuna, MONEDE, TITULARI } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../incarca";
import { EroareFoaie } from "../ui";

import ContNou from "./ContNou";

export const metadata = { title: "Deschide cont — Acasă" };

export default async function PaginaContNou({ searchParams }: { searchParams: Promise<{ scop?: string }> }) {
  const { scop } = await searchParams;
  const { stare, eroare } = await incarcaEconomii();
  return (
    <main>
      <Antet supratitlu="Economii" titlu="Deschide cont" inapoi={{ href: "/bani/economii", eticheta: "Economii" }} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        {stare ? (
          <ContNou
            azi={azi()}
            scopuri={[...fonduriDinLuna(stare.model).map((f) => f.nume), "Nealocat"]}
            scop={scop ?? null}
            surse={stare.economii.conturi.filter((c) => !areScadenta(c) && !esteInvestitie(c)).map(contPeEcran)}
            titulari={TITULARI}
            monede={MONEDE}
            impozit={stare.economii.impozit}
            randuriLibere={stare.economii.randuriLibere.length}
          />
        ) : <EroareFoaie motiv={eroare} />}
      </div>
    </main>
  );
}
