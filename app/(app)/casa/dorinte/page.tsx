import { desc } from "drizzle-orm";

import Antet from "@/componente/Antet";
import { db } from "@/lib/db";
import { dorinte } from "@/lib/db/schema";

import Dorinte from "./Dorinte";

export const metadata = { title: "Dorințe — Acasă" };

export default async function PaginaDorinte() {
  const toate = await db.select().from(dorinte).orderBy(desc(dorinte.creatLa));
  const idei = toate.filter((d) => d.stare === "idee");

  return (
    <main>
      <Antet
        supratitlu="Casa · Dorințe"
        titlu={
          idei.length === 0 ? "Nimic pe listă" : idei.length === 1 ? "1 lucru" : `${idei.length} lucruri`
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <Dorinte dorinte={toate} />
      </div>
    </main>
  );
}
