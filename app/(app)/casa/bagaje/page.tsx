import { asc, desc } from "drizzle-orm";

import Antet from "@/componente/Antet";
import { db } from "@/lib/db";
import { articoleBagaj, articoleSablonBagaj, bagaje, sabloaneBagaj } from "@/lib/db/schema";

import Bagaje, { type Bagaj, type Sablon } from "./Bagaje";

export const metadata = { title: "Bagaje — Acasă" };

export default async function PaginaBagaje() {
  const [sabloane, articoleSabloane, listePornite, articoleListe] = await Promise.all([
    db.select().from(sabloaneBagaj).orderBy(asc(sabloaneBagaj.nume)),
    db.select().from(articoleSablonBagaj).orderBy(asc(articoleSablonBagaj.ordine)),
    db.select().from(bagaje).orderBy(desc(bagaje.creatLa)),
    db.select().from(articoleBagaj).orderBy(asc(articoleBagaj.id)),
  ]);

  const sabloaneCuArticole: Sablon[] = sabloane.map((s) => ({
    id: s.id,
    nume: s.nume,
    articole: articoleSabloane
      .filter((a) => a.sablonId === s.id)
      .map((a) => ({ id: a.id, text: a.text })),
  }));

  const bagajeCuArticole: Bagaj[] = listePornite.map((b) => ({
    id: b.id,
    nume: b.nume,
    articole: articoleListe
      .filter((a) => a.bagajId === b.id)
      .map((a) => ({ id: a.id, text: a.text, bifat: a.bifat })),
  }));

  return (
    <main>
      <Antet
        supratitlu="Casa · Bagaje"
        titlu={
          bagajeCuArticole.length > 0
            ? bagajeCuArticole.length === 1
              ? "1 listă pornită"
              : `${bagajeCuArticole.length} liste pornite`
            : "Șabloane de bagaje"
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <Bagaje sabloane={sabloaneCuArticole} bagaje={bagajeCuArticole} />
      </div>
    </main>
  );
}
