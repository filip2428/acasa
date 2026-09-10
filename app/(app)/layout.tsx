import { redirect } from "next/navigation";

import NavigareJos from "@/componente/NavigareJos";
import { sesiuneCurenta } from "@/lib/sesiune";

export default async function LayoutAplicatie({ children }: { children: React.ReactNode }) {
  if (!(await sesiuneCurenta())) redirect("/intrare");

  return (
    <div className="zona-sigura-jos min-h-dvh">
      {children}
      <NavigareJos />
    </div>
  );
}
