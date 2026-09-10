import Antet from "@/componente/Antet";
import { caietulDeRetete } from "@/lib/servicii/retete";

import Caiet from "./Caiet";

export const metadata = { title: "Rețete — Acasă" };

export default async function PaginaRetete() {
  const retete = await caietulDeRetete();
  const acum = retete.filter((r) => r.dinTotal > 0 && r.ai === r.dinTotal).length;

  return (
    <main>
      <Antet
        supratitlu="Mese · Rețete"
        titlu={
          retete.length === 0
            ? "Caietul"
            : acum === 0
              ? `${retete.length} rețete`
              : `${acum} se pot face acum`
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <Caiet retete={retete} />
      </div>
    </main>
  );
}
