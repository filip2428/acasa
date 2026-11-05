import Antet from "@/componente/Antet";
import { contPeEcran, areScadenta } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../incarca";
import { EroareFoaie } from "../ui";

import Muta from "./Muta";

export const metadata = { title: "Mută bani — Acasă" };

export default async function PaginaMuta({ searchParams }: { searchParams: Promise<{ din?: string; spre?: string }> }) {
  const { din, spre } = await searchParams;
  const { stare, eroare } = await incarcaEconomii();
  const inapoi = { href: "/bani/economii", eticheta: "Economii" };
  return (
    <main>
      <Antet supratitlu="Economii" titlu="Mută bani" inapoi={inapoi} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        {stare
          ? <Muta conturi={stare.economii.conturi.filter((c) => !areScadenta(c)).map(contPeEcran)} din={Number(din) || null} spre={Number(spre) || null} />
          : <EroareFoaie motiv={eroare} />}
      </div>
    </main>
  );
}
