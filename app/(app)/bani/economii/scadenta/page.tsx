import Antet from "@/componente/Antet";
import { azi as ziuaDeAzi, zileIntre } from "@/lib/formatare";
import { adaugaLuni } from "@/lib/formatare";
import { areScadenta, citesteNotaDepozit, contPeEcran, dobandaNeta } from "@/lib/servicii/model-buget";

import { incarcaEconomii } from "../incarca";
import { EroareFoaie } from "../ui";

import Scadenta from "./Scadenta";

export const metadata = { title: "Scadență — Acasă" };

export default async function PaginaScadenta({ searchParams }: { searchParams: Promise<{ cont?: string }> }) {
  const { cont } = await searchParams;
  const { stare, eroare } = await incarcaEconomii();
  const inapoi = { href: "/bani/economii", eticheta: "Economii" };
  if (!stare) {
    return <main><Antet supratitlu="Economii" titlu="Scadență" inapoi={inapoi} /><div className="mx-auto -mt-5 max-w-lg px-4"><EroareFoaie motiv={eroare} /></div></main>;
  }
  const azi = ziuaDeAzi();
  const depozite = stare.economii.conturi.filter((c) => areScadenta(c) && c.sold > 0)
    .sort((a, b) => (a.scadenta ?? "9999").localeCompare(b.scadenta ?? "9999"))
    .map((c) => {
      const nota = citesteNotaDepozit(c.nota);
      const luniDinProdus = /(\d+)\s*lun/i.exec(c.produs);
      const luni = nota.luni ?? (luniDinProdus ? Number(luniDinProdus[1]) : null);
      const start = nota.start ?? (c.scadenta && luni ? adaugaLuni(c.scadenta, -luni) : null);
      const zile = start && c.scadenta ? zileIntre(start, c.scadenta) : 0;
      return {
        ...contPeEcran(c), luni, zileRamase: c.scadenta ? zileIntre(azi, c.scadenta) : null,
        dobandaEstimata: dobandaNeta(c.sold, c.dobanda, zile, c.tip === "Titluri de stat", stare.economii.impozit),
        estimataSigur: nota.start != null,
      };
    });
  return (
    <main>
      <Antet supratitlu="Economii" titlu="Depozit la scadență" inapoi={inapoi} />
      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <Scadenta depozite={depozite} conturi={stare.economii.conturi.filter((c) => !areScadenta(c)).map(contPeEcran)} ales={Number(cont) || null} />
      </div>
    </main>
  );
}
