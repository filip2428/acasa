/*
  Antetul emailat. E prima suprafață pe care o vezi și singurul loc din aplicație
  unde ne permitem textură. Colțurile de jos sunt rotunjite ca buza unui vas, iar
  primul card din pagină urcă peste el ca să lege cele două suprafețe.
*/

export default function Antet({
  supratitlu,
  titlu,
  dreapta,
}: {
  supratitlu?: string;
  titlu: string;
  dreapta?: React.ReactNode;
}) {
  return (
    <header
      className="email buza rounded-b-[1.75rem] px-5 pb-9"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
