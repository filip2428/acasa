# Acasă

Aplicația casei, pentru Filip și Ralu. Cumpărături cu prețuri, cămară, mese,
treburile casei — într-un singur loc, pe telefon.

## Pornire

Node 22 e obligatoriu.

```bash
npm install
npm run pregatire     # generează .env.local (secret de sesiune, chei VAPID)
npm run db:generate   # scrie migrările din schemă
npm run db:migrate    # le aplică pe local.db
npm run date:demo     # persoanele, categoriile, magazinele, zonele casei
npm run dev
```

`npm run date:demo` afișează **o singură dată** codurile de acces. Dacă se pierd:

```bash
npm run cod:nou -- --id 1
```

## Cum e făcută

- **Next.js 16** (App Router) + React 19 + TypeScript + Tailwind 4.
- **Drizzle ORM** peste SQLite: local `local.db`, în producție **Turso** — același
  driver `@libsql/client`, se schimbă doar variabilele de mediu.
- **Autentificare cu cod de acces**, fără email și fără parolă. Codul are forma
  `ABCD-EFGHJK`: primele 4 caractere sunt publice (căutare prin index), ultimele 6
  sunt hash-uite cu scrypt. Sesiune JWT în cookie httpOnly, un an. Maximum 8
  încercări greșite la 15 minute, numărate pe IP și pe cod, plus un câmp-capcană.
- **PWA**, gândită pentru iPhone: se instalează pe ecranul principal, iar
  notificările push funcționează doar din aplicația instalată așa.
- Totul — texte, nume de fișiere, funcții, comentarii — e în română.

## Legăturile cu exteriorul

| Serviciu | La ce | Cum se leagă |
|---|---|---|
| Google Sheets | Bugetul lunar (`Buget_Familial`) | Partajezi foaia cu adresa contului de serviciu, ca **Editor** |
| Google Calendar | Ferestrele libere ale fiecăruia | Fiecare își partajează calendarul, **doar citire** |
| Open Food Facts | Nume și poză după codul de bare | Public, fără cont |
| Cookidoo | Rețete și plan săptămânal (etapa 5) | Cont propriu, bibliotecă neoficială |

Bugetul rămâne în foaia din Google — aplicația nu ține un buget paralel. Citește
categoriile lunii curente și, de la etapa 3, scrie înapoi rânduri de tranzacție.

## Etape

1. **Fundația** — autentificare, PWA, listă de cumpărături, catalog cu cod de bare
   și prețuri, totalul coșului, bugetul (citire). ← *aici suntem*
2. Notificări push, ecranul „Azi”, zonele casei, curățenie recurentă, declutter rotativ.
3. Cămara, expirări, bonul fiscal cu AI, bugetul (scriere).
4. Google Calendar și motorul de propuneri.
5. Cookidoo, planificatorul de meniu, fazele ciclului, „ce gătim azi”.
6. Calendarul casei, dorințe, șabloane de bagaje, Siri Shortcuts.

Schema bazei de date (`lib/db/schema.ts`) e scrisă din start pentru toate etapele.
