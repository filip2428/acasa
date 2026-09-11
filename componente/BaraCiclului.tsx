import { FAZE, segmenteleCiclului } from "@/lib/servicii/socoteli-ciclu";

/*
  Ciclul, ca o bară: o căsuță pe zi, colorată după fază, cu un semn de alamă
  deasupra zilei de azi. Pe telefon încap 28–35 de zile fără să se strângă prea
  mult, și dintr-o privire se vede cât a trecut și ce urmează.

  Componentă fără stare, ca s-o poată folosi și cardul de pe „Azi”, și ecranul
  ciclului.
*/

export default function BaraCiclului({
  lungime,
  menstruatie,
  ziuaCiclului,
  mica = false,
}: {
  lungime: number;
  menstruatie: number;
  ziuaCiclului: number | null;
  mica?: boolean;
}) {
  const segmente = segmenteleCiclului(lungime, menstruatie);
  // Câteva zile peste lungimea obișnuită: semnul rămâne pe ultima căsuță.
  const azi = ziuaCiclului == null ? null : Math.min(ziuaCiclului, lungime);

  return (
    <div
      role="img"
      aria-label={
        azi == null
          ? `Ciclu de ${lungime} de zile`
          : `Ziua ${ziuaCiclului} dintr-un ciclu de aproximativ ${lungime} de zile`
      }
    >
      <div className={`flex ${mica ? "gap-px" : "gap-0.5"}`}>
        {Array.from({ length: lungime }, (_, i) => {
          const zi = i + 1;
          const faza = segmente.find((s) => zi >= s.deLa && zi <= s.panaLa)!.faza;
          const esteAzi = zi === azi;
          return (
            <div key={zi} className="relative flex-1">
              {esteAzi && (
                <span
                  aria-hidden
                  className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-alama)] ${
                    mica ? "-top-2 size-1.5" : "-top-3 size-2"
                  }`}
                />
              )}
              <div
                className={`${mica ? "h-2" : "h-4"} ${
                  zi === 1 ? "rounded-l-full" : ""
                } ${zi === lungime ? "rounded-r-full" : ""} ${
                  azi != null && zi > azi ? "opacity-45" : ""
                }`}
                style={{ backgroundColor: FAZE[faza].culoare }}
              />
            </div>
          );
        })}
      </div>

      {!mica && (
        <div className="mt-2 flex justify-between text-xs text-[var(--color-creion)]">
          <span className="cifre">1</span>
          <span className="cifre">{lungime}</span>
        </div>
      )}
    </div>
  );
}

export function LegendaFazelor() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {Object.values(FAZE).map((f) => (
        <li key={f.eticheta} className="flex items-center gap-1.5 text-xs text-[var(--color-creion)]">
          <span className="block size-2 rounded-full" style={{ backgroundColor: f.culoare }} />
          {f.eticheta}
        </li>
      ))}
    </ul>
  );
}
