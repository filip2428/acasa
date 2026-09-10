import { redirect } from "next/navigation";

import { sesiuneCurenta } from "@/lib/sesiune";

import FormularIntrare from "./FormularIntrare";

export const metadata = { title: "Intră — Acasă" };

export default async function PaginaIntrare() {
  if (await sesiuneCurenta()) redirect("/");

  return (
    <main className="email flex min-h-dvh flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <p className="eticheta text-white/55">Filip &amp; Ralu</p>
        <h1 className="titlu mt-2 text-[2.75rem] text-white">Acasă</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/70">
          Cumpărături, cămară, mese și treburile casei. Intri cu codul tău.
        </p>

        <div className="card mt-8 p-5">
          <FormularIntrare />
        </div>
      </div>
    </main>
  );
}
