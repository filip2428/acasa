import Antet from "@/componente/Antet";
import { bugetulLunii } from "@/lib/servicii/buget";
import { produsePeCategorii } from "@/lib/servicii/categorii";
import { areGoogle } from "@/lib/servicii/google";
import { categoriileActive } from "@/lib/servicii/lista";

import Categorii from "./Categorii";

export const metadata = { title: "Categorii — Acasă" };

export default async function PaginaCategorii() {
  const [categorii, cate, buget] = await Promise.all([
    categoriileActive(),
    produsePeCategorii(),
    // Dacă foaia nu răspunde, tot se pot face și ordona categorii.
    areGoogle() ? bugetulLunii().catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <main>
      <Antet
        supratitlu="Catalog · Categorii"
        titlu={categorii.length === 1 ? "O categorie" : `${categorii.length} categorii`}
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <Categorii
          categorii={categorii.map((c) => ({
            id: c.id,
            nume: c.nume,
            categorieBuget: c.categorieBuget,
            produse: cate.get(c.id) ?? 0,
          }))}
          dinBuget={buget.map((r) => r.categorie)}
        />
      </div>
    </main>
  );
}
