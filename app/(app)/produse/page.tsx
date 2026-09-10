import Antet from "@/componente/Antet";
import { categoriileActive } from "@/lib/servicii/lista";
import { catalog } from "@/lib/servicii/produse";

import CatalogClient from "./Catalog";

export const metadata = { title: "Produse — Acasă" };

export default async function PaginaProduse() {
  const [produse, categorii] = await Promise.all([catalog(), categoriileActive()]);

  return (
    <main>
      <Antet
        supratitlu="Catalog"
        titlu={produse.length === 1 ? "1 produs" : `${produse.length} produse`}
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <CatalogClient produse={produse} categorii={categorii} />
      </div>
    </main>
  );
}
