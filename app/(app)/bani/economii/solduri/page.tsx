import Antet from "@/componente/Antet";
import { contPeEcran } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../incarca";
import { EroareFoaie } from "../ui";

import Solduri from "./Solduri";

export const metadata = { title: "Actualizează soldurile — Acasă" };

export default async function PaginaSolduri() {
  const { stare, eroare } = await incarcaEconomii();
  return (
    <main>
      <Antet supratitlu="Economii" titlu="Actualizează soldurile" inapoi={{ href: "/bani/economii", eticheta: "Economii" }} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        {stare ? <Solduri conturi={stare.economii.conturi.map(contPeEcran)} /> : <EroareFoaie motiv={eroare} />}
      </div>
    </main>
  );
}
