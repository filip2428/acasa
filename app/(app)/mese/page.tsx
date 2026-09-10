import Antet from "@/componente/Antet";
import { azi, ziLunga } from "@/lib/formatare";
import { cePotGati } from "@/lib/servicii/meniu";
import { lipsurilePlanului, planulSaptamanii } from "@/lib/servicii/retete";
import { sesiuneCurenta } from "@/lib/sesiune";

import Plan from "./Plan";

export const metadata = { title: "Mese — Acasă" };

/*
  Bucătăria, într-un singur ecran: ce s-a hotărât pentru zilele care vin și ce
  lipsește ca să se poată face. Caietul de rețete stă un tap mai încolo — la el
  te duci rar, aici te uiți des.
*/

const CATE_ZILE = 7;

function saptamana(ziuaDeAzi: string) {
  const zile: { valoare: string; eticheta: string; esteAzi: boolean }[] = [];

  for (let i = 0; i < CATE_ZILE; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const valoare = azi(d);
    zile.push({
      valoare,
      eticheta: i === 0 ? "Azi" : i === 1 ? "Mâine" : ziLunga(d),
      esteAzi: valoare === ziuaDeAzi,
    });
  }

  return zile;
}

export default async function PaginaMese() {
  const sesiune = await sesiuneCurenta();
  const ziuaDeAzi = azi();
  const zile = saptamana(ziuaDeAzi);
  const ultima = zile[zile.length - 1].valoare;

  const [mese, retete, lipsuri] = await Promise.all([
    planulSaptamanii(ziuaDeAzi, ultima),
    cePotGati(sesiune?.persoanaId ?? 0, ziuaDeAzi),
    lipsurilePlanului(ziuaDeAzi, ultima, ziuaDeAzi),
  ]);

  const nefacute = mese.filter((m) => !m.gatitLa).length;

  return (
    <main>
      <Antet
        supratitlu="Mese"
        titlu={
          mese.length === 0
            ? "Nimic hotărât"
            : nefacute === 0
              ? "Săptămâna e gătită"
              : `${nefacute} de gătit`
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <Plan zile={zile} mese={mese} retete={retete} lipsuri={lipsuri} />
      </div>
    </main>
  );
}
