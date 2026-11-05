import Antet from "@/componente/Antet";
import { azi } from "@/lib/formatare";
import { areScadenta, contPeEcran, GRUPE } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../incarca";
import { EroareFoaie } from "../ui";

import Plata from "./Plata";

export const metadata = { title: "Plătește din economii — Acasă" };

/*
  O cheltuială plătită din bani puși deoparte (iPad din Fond Tech, RCA din Fond
  Mașină): intră în tranzacțiile lunii cu „Din …”, nu în bugetul lunii, iar
  contul fondului scade.
*/

export default async function PaginaPlata() {
  const { stare, eroare } = await incarcaEconomii();
  const inapoi = { href: "/bani", eticheta: "Bani" };
  if (!stare) {
    return <main><Antet supratitlu="Bani" titlu="Plătește din economii" inapoi={inapoi} /><div className="mx-auto -mt-5 max-w-lg px-4"><EroareFoaie motiv={eroare} /></div></main>;
  }
  const economie = new Set<string>(GRUPE.filter((g) => g.economie).map((g) => g.tip));
  return (
    <main>
      <Antet supratitlu="Bani" titlu="Plătește din economii" inapoi={inapoi} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <Plata
          azi={azi()}
          categorii={stare.model.categorii.filter((c) => !economie.has(c.tip)).map((c) => c.nume)}
          surse={stare.surse}
          conturi={stare.economii.conturi.filter((c) => !areScadenta(c)).map(contPeEcran)}
        />
      </div>
    </main>
  );
}
