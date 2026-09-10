"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
  Navigarea stă jos, în dreptul degetului mare, ca o pastilă care plutește peste
  conținut. Nu e o bară lipită de marginea ecranului: la telefoanele fără buton
  fizic, bara de sistem trece exact peste ea.
*/

const CAI = [
  { href: "/", eticheta: "Azi", icoana: IcoanaCasa },
  { href: "/lista", eticheta: "Listă", icoana: IcoanaLista },
  { href: "/produse", eticheta: "Produse", icoana: IcoanaCos },
  { href: "/setari", eticheta: "Setări", icoana: IcoanaSetari },
];

export default function NavigareJos() {
  const cale = usePathname();

  return (
    <nav
      aria-label="Secțiunile aplicației"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <ul className="card buza flex w-full max-w-sm items-center justify-around gap-1 p-1.5">
        {CAI.map(({ href, eticheta, icoana: Icoana }) => {
          const activ = href === "/" ? cale === "/" : cale.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={activ ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[0.6875rem] font-semibold transition-colors ${
                  activ ? "email text-white" : "text-[var(--color-creion)]"
                }`}
              >
                <Icoana />
                {eticheta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const proprietatiIcoana = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function IcoanaCasa() {
  return (
    <svg {...proprietatiIcoana}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.75 20v-5.5h4.5V20" />
    </svg>
  );
}

function IcoanaLista() {
  return (
    <svg {...proprietatiIcoana}>
      <path d="M4 6.5h2M4 12h2M4 17.5h2" />
      <path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20" />
    </svg>
  );
}

function IcoanaCos() {
  return (
    <svg {...proprietatiIcoana}>
      <path d="M4 8h16l-1.4 10.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function IcoanaSetari() {
  return (
    <svg {...proprietatiIcoana}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}
