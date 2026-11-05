import Antet from "@/componente/Antet";
import { azi } from "@/lib/formatare";
import { contPentruScop, etichetaCont, fonduriDinLuna, FOND_URGENTA, INVESTITII } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../economii/incarca";
import { EroareFoaie } from "../economii/ui";

import Ocazional from "./Ocazional";

export const metadata = { title: "Venit ocazional — Acasă" };

/*
  Bani care nu vin în fiecare lună: cadouri, vânzări, bonusuri. Nu se
  planifică; se împart când intră — 10% zeciuială, apoi după regula aleasă.
*/

export default async function PaginaOcazional() {
  const { stare, eroare } = await incarcaEconomii();
  const inapoi = { href: "/bani", eticheta: "Bani" };
  if (!stare) {
    return <main><Antet supratitlu="Bani" titlu="Venit ocazional" inapoi={inapoi} /><div className="mx-auto -mt-5 max-w-lg px-4"><EroareFoaie motiv={eroare} /></div></main>;
  }
  const fonduri = fonduriDinLuna(stare.model).map((f) => f.nume).filter((f) => f !== INVESTITII);
  const contPeFond = Object.fromEntries([INVESTITII, ...fonduri].map((f) => {
    const c = contPentruScop(stare.economii.conturi, f);
    return [f, c ? etichetaCont(c) : ""];
  }));
  return (
    <main>
      <Antet supratitlu="Bani" titlu="Venit ocazional" inapoi={inapoi} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <Ocazional azi={azi()} fonduri={fonduri} fondImplicit={fonduri.includes(FOND_URGENTA) ? FOND_URGENTA : fonduri[0] ?? ""} contPeFond={contPeFond} />
      </div>
    </main>
  );
}
