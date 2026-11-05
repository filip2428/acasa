import Antet from "@/componente/Antet";
import { contPeEcran } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../incarca";
import { EroareFoaie } from "../ui";

import Inchide from "./Inchide";

export const metadata = { title: "Închide cont — Acasă" };

export default async function PaginaInchide({ searchParams }: { searchParams: Promise<{ cont?: string }> }) {
  const { cont } = await searchParams;
  const { stare, eroare } = await incarcaEconomii();
  return (
    <main>
      <Antet supratitlu="Economii" titlu="Închide cont" inapoi={{ href: "/bani/economii", eticheta: "Economii" }} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        {stare ? <Inchide conturi={stare.economii.conturi.map(contPeEcran)} ales={Number(cont) || null} /> : <EroareFoaie motiv={eroare} />}
      </div>
    </main>
  );
}
