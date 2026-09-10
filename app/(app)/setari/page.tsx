import { redirect } from "next/navigation";

import Antet from "@/componente/Antet";
import Notificari from "@/componente/Notificari";
import { lunaCurenta } from "@/lib/formatare";
import { bugetulLunii } from "@/lib/servicii/buget";
import { areGoogle, emailServiciu } from "@/lib/servicii/google";
import { cheiePublica } from "@/lib/servicii/push";
import { db } from "@/lib/db";
import { persoane } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { iesi, sesiuneCurenta } from "@/lib/sesiune";

import CalendarulMeu from "./CalendarulMeu";

export const metadata = { title: "Setări — Acasă" };

async function deconecteaza() {
  "use server";
  await iesi();
  redirect("/intrare");
}

export default async function PaginaSetari() {
  const sesiune = await sesiuneCurenta();
  const conectatLaGoogle = areGoogle();
  const buget = conectatLaGoogle ? await bugetulLunii() : [];

  const [eu] = sesiune
    ? await db
        .select({ calendarGoogleId: persoane.calendarGoogleId })
        .from(persoane)
        .where(eq(persoane.id, sesiune.persoanaId))
        .limit(1)
    : [];

  return (
    <main>
      <Antet supratitlu="Setări" titlu={sesiune?.nume ?? "Contul tău"} />

      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        <section className="card p-4">
          <h2 className="eticheta">Bugetul</h2>
          {conectatLaGoogle ? (
            <p className="mt-2 text-[0.9375rem] leading-relaxed">
              Citim foaia <strong>{lunaCurenta()}</strong> din Buget_Familial.{" "}
              {buget.length > 0
                ? `Am găsit ${buget.length} categorii.`
                : "Foaia lunii curente n-are încă rânduri de cheltuieli."}
            </p>
          ) : (
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">
              Nu e legat de Google. Completează <code className="cifre">GOOGLE_EMAIL_SERVICIU</code>{" "}
              și <code className="cifre">GOOGLE_CHEIE_PRIVATA</code> în{" "}
              <code className="cifre">.env.local</code>, apoi partajează foaia cu adresa contului de
              serviciu.
            </p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="eticheta">Calendarul tău Google</h2>
          <div className="mt-2">
            <CalendarulMeu
              calendarId={eu?.calendarGoogleId ?? null}
              emailServiciu={conectatLaGoogle ? emailServiciu() : null}
            />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="eticheta">Notificări</h2>
          <div className="mt-2">
            <Notificari cheiePublica={cheiePublica()} />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="eticheta">Pe ecranul telefonului</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed">
            Din Safari, apasă butonul de partajare și „Adaugă pe ecranul principal”.
            Notificările merg pe iPhone doar din aplicația instalată așa.
          </p>
        </section>

        <form action={deconecteaza}>
          <button type="submit" className="buton buton-secundar buton-sters w-full">
            Ieși din cont
          </button>
        </form>

        <p className="pb-4 text-center text-xs text-[var(--color-creion)]">Acasă · etapa 1</p>
      </div>
    </main>
  );
}
