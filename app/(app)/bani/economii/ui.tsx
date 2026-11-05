import Link from "next/link";

/*
  Piese mici, fără stare, pentru ecranele de economii.
*/

export function Bara({ procent, culoare = "var(--color-smalt-viu)" }: { procent: number; culoare?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(procent * 100)));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-chit)]" aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: culoare }} />
    </div>
  );
}

export function Sageata() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-creion)" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** Un rând-legătură: etichetă mică, titlu, detaliu, săgeată. */
export function CardLegatura({
  href, eticheta, titlu, detaliu, dreapta,
}: { href: string; eticheta: string; titlu: string; detaliu?: React.ReactNode; dreapta?: React.ReactNode }) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-4">
      <span className="min-w-0 flex-1">
        <span className="eticheta">{eticheta}</span>
        <span className="titlu mt-1 block truncate text-xl">{titlu}</span>
        {detaliu && <span className="mt-0.5 block text-sm text-[var(--color-creion)]">{detaliu}</span>}
      </span>
      {dreapta}
      <Sageata />
    </Link>
  );
}

export function EroareFoaie({ motiv }: { motiv: string }) {
  return (
    <section className="card p-4">
      <h2 className="titlu text-lg">Nu pot citi foaia de buget</h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-creion)]">{motiv}</p>
    </section>
  );
}
