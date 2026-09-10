import "server-only";

import { JWT } from "google-auth-library";

/*
  Accesul la Google, printr-un cont de serviciu.

  Nu folosim OAuth: n-are rost un ecran de consimțământ și jetoane care expiră
  pentru două persoane. În schimb, fiecare resursă se partajează o singură dată
  cu adresa contului de serviciu:
  - foaia Buget_Familial, ca Editor;
  - calendarul Google al fiecăruia, doar cu drept de citire.

  Aplicația nu cere niciodată parola nimănui și nu poate vedea altceva decât ce
  i-ați partajat explicit.
*/

const DOMENII = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

let clientCache: JWT | null = null;

export function areGoogle() {
  return Boolean(process.env.GOOGLE_EMAIL_SERVICIU && process.env.GOOGLE_CHEIE_PRIVATA);
}

function client() {
  if (clientCache) return clientCache;

  const email = process.env.GOOGLE_EMAIL_SERVICIU;
  const cheie = process.env.GOOGLE_CHEIE_PRIVATA;
  if (!email || !cheie) {
    throw new Error("Lipsesc GOOGLE_EMAIL_SERVICIU și GOOGLE_CHEIE_PRIVATA din .env.local.");
  }

  clientCache = new JWT({
    email,
    // În fișierele .env cheia stă pe o linie, cu „\n” scris ca text.
    key: cheie.replace(/\\n/g, "\n"),
    scopes: DOMENII,
  });

  return clientCache;
}

/** Cerere autentificată către API-urile Google. Aruncă dacă răspunsul nu e 2xx. */
export async function cereGoogle<T>(url: string, optiuni?: RequestInit): Promise<T> {
  const jetoane = await client().getAccessToken();

  const raspuns = await fetch(url, {
    ...optiuni,
    headers: {
      Authorization: `Bearer ${jetoane.token}`,
      "Content-Type": "application/json",
      ...optiuni?.headers,
    },
    cache: "no-store",
  });

  if (!raspuns.ok) {
    const detaliu = await raspuns.text();
    throw new Error(`Google a răspuns ${raspuns.status}: ${detaliu.slice(0, 300)}`);
  }

  return raspuns.json() as Promise<T>;
}
