import Antet from "@/componente/Antet";
import { lei, lunaInCuvinte } from "@/lib/formatare";
import { contPentruScop, contPeEcran } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../incarca";
import { EroareFoaie } from "../ui";

import Transferuri from "./Transferuri";

export const metadata = { title: "Transferurile lunii — Acasă" };

/*
  Planul de Fond / Avere al lunii ajunge în conturi. Pentru fiecare fond: cât e
  planificat, cât s-a mutat deja, și contul în care ajunge (după „Scop”).
*/

export default async function PaginaTransferuri() {
  const { stare, eroare } = await incarcaEconomii();
  const inapoi = { href: "/bani/economii", eticheta: "Economii" };
  if (!stare) {
    return (
      <main>
        <Antet supratitlu="Economii · Transferuri" titlu="Transferurile lunii" inapoi={inapoi} />
        <div className="mx-auto -mt-5 max-w-lg px-4"><EroareFoaie motiv={eroare} /></div>
      </main>
    );
  }

  const conturi = stare.economii.conturi.filter((c) => !c.tip.startsWith("Depozit") && c.tip !== "Titluri de stat");
  const lista = stare.fonduri.filter((f) => f.plan > 0).map((f) => ({
    categorie: f.nume, plan: f.plan, facut: f.pus, ramas: f.deMutat,
    cont: contPentruScop(stare.economii.conturi, f.nume)?.rand ?? null,
  }));
  const deMutat = lista.reduce((t, x) => t + x.ramas, 0);

  return (
    <main>
      <Antet supratitlu={`Economii · ${lunaInCuvinte(stare.luna)}`} titlu={deMutat > 0.5 ? `${lei(deMutat, true)} de mutat` : "Totul e mutat"} inapoi={inapoi} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <Transferuri
          lista={lista}
          conturi={conturi.map(contPeEcran)}
          surse={conturi.filter((c) => c.moneda === "RON" && c.lichiditate === "Imediat" && !c.tip.includes("Broker")).map(contPeEcran)}
        />
      </div>
    </main>
  );
}
