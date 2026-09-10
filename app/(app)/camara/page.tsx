import Antet from "@/componente/Antet";
import { camara, produseDeAdaugat } from "@/lib/servicii/camara";

import Camara from "./Camara";

export const metadata = { title: "Cămară — Acasă" };

export default async function PaginaCamara() {
  const [stoc, produse] = await Promise.all([camara(), produseDeAdaugat()]);

  const expira = stoc.filter(
    (r) => r.zilePanaLaExpirare != null && r.zilePanaLaExpirare <= 2,
  ).length;

  return (
    <main>
      <Antet
        supratitlu="Cămară"
        titlu={
          stoc.length === 0
            ? "Goală"
            : stoc.length === 1
              ? "1 lucru în casă"
              : `${stoc.length} lucruri în casă`
        }
        dreapta={
          expira > 0 ? (
            <span className="cifre text-sm text-white/70">{expira} expiră</span>
          ) : null
        }
      />

      <div className="mx-auto -mt-5 max-w-lg space-y-3 px-4">
        <Camara stoc={stoc} produse={produse} />
      </div>
    </main>
  );
}
