/*
  Antetul emailat. E prima suprafață pe care o vezi și singurul loc din aplicație
  unde ne permitem textură. Colțurile de jos sunt rotunjite ca buza unui vas, iar
  primul card din pagină urcă peste el ca să lege cele două suprafețe.
*/

import Link from "next/link";

export default function Antet({
  supratitlu,
  titlu,
  dreapta,
  inapoi,
}: {
  supratitlu?: string;
  titlu: string;
  dreapta?: React.ReactNode;
  /** Pentru paginile de sub o secțiune: instalată pe iPhone, aplicația n-are buton de înapoi. */
  inapoi?: { href: string; eticheta: string };
}) {
  return (
    <header
      className="email buza rounded-b-[1.75rem] px-5 pb-9"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {inapoi && (
            <Link
              href={inapoi.href}
              className="-ml-1 mb-1 inline-flex min-h-[2.75rem] items-center gap-1 pr-3 text-sm font-semibold text-white/75"
            >
              <span aria-hidden className="text-lg leading-none">‹</span>
              {inapoi.eticheta}
            </Link>
          )}
          {supratitlu && (
            <p className="eticheta text-white/55">{supratitlu}</p>
          )}
          <h1 className="titlu mt-1 text-[1.625rem] text-white">{titlu}</h1>
        </div>
        {dreapta && <div className="shrink-0 pt-1">{dreapta}</div>}
      </div>
    </header>
  );
}
