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
| Google Calendar | Programul fiecăruia și ferestrele libere | Fiecare își leagă calendarul din **Setări**; partajare **doar citire** (sau „modificări la evenimente”, dacă vrei să poți scrie în el din aplicație) |
| Open Food Facts | Nume și poză după codul de bare | Public, fără cont |
| Cookidoo | Rețete și plan săptămânal (etapa 5) | Cont propriu, bibliotecă neoficială |

Bugetul rămâne în foaia din Google — aplicația nu ține un buget paralel. Citește
categoriile lunii curente și, de la etapa 3, scrie înapoi rânduri de tranzacție.

## Etape

1. ~~Fundația~~ — autentificare, PWA, listă de cumpărături, catalog cu cod de bare
   și prețuri, totalul coșului, bugetul (citire). **gata**
2. ~~Notificări push, ecranul „Azi”, zonele casei, curățenie recurentă, declutter
   rotativ~~, plus cheltuieli manuale pe orice categorie și scrierea în buget. **gata**
3. ~~Cămara, expirări~~ **gata** · bonul fiscal cu AI — *are nevoie de o cheie
   `ANTHROPIC_API_KEY`*.
4. ~~Google Calendar și motorul de propuneri~~ **gata** — *fiecare trebuie să-și
   partajeze calendarul cu contul de serviciu și să-l lege din Setări*.
5. Cookidoo, planificatorul de meniu, fazele ciclului, „ce gătim azi” — *are
   nevoie de credențialele Cookidoo*.
6. ~~Calendarul casei, dorințe, șabloane de bagaje~~ **gata** · Siri Shortcuts.

Schema bazei de date (`lib/db/schema.ts`) e scrisă din start pentru toate etapele.

## Contul de serviciu Google

Pentru buget (și, mai târziu, pentru calendare):

1. [console.cloud.google.com](https://console.cloud.google.com) → proiect nou, `acasa`.
2. **API-uri și servicii → Bibliotecă** → activează **Google Sheets API** și
   **Google Calendar API**.
3. **IAM și administrare → Conturi de serviciu → Creează**. Nume `acasa`, fără roluri.
4. Deschide contul creat → **Chei → Adaugă cheie → Creează cheie nouă → JSON**.
   Se descarcă un fișier. Nu-l pune în git.
5. `npm run google -- <calea către fișierul JSON>` — scrie singur cele două valori
   în `.env.local`, cu cheia privată formatată cum trebuie.
6. Partajează foaia `Buget_Familial` cu adresa contului de serviciu, ca **Editor**.
   Adresa e afișată de script și arată a `acasa@....iam.gserviceaccount.com`.
7. Fiecare, pe rând: Google Calendar → calendarul propriu → **Setări și
   partajare** → *Partajați cu anumite persoane* → aceeași adresă, cu dreptul
   **Vizualizați toate detaliile evenimentelor**. Apoi, în aplicație, **Setări →
   Calendarul tău Google** → scrii adresa calendarului (de obicei adresa de
   Gmail) și apeși *Verifică și leagă*. Verificarea citește efectiv din calendar;
   nu salvează nimic dacă n-a mers.

Contul de serviciu nu vede decât ce i-ai partajat explicit. Nu cere parola nimănui.

## Calendarul

Două vederi, pentru două întrebări:

- **Luna** — grila obișnuită, în care intră suprapuse scadențele casei (punct
  verde), ritmul treburilor (punct alamă) și programul fiecăruia din Google
  (dunga colorată de sub zi, o culoare de om). Zilele goale se văd la fel de
  clar ca cele pline — acolo încape ceva.
- **Listă** — ce urmează, pe categorii: mașină, casă, sănătate, documente.

Recurența pleacă de la **ultima efectuare**, nu de la o dată fixă: apeși „Făcut
azi” și următorul se socotește de acolo. Așa ITP-ul nu se decalează an de an.

Orice lucru din calendarul casei poate fi trecut și în Google Calendar, dar
**numai dacă bifezi asta la el** — nu e niciodată implicit. Copia din Google se
mută singură când apeși „Făcut azi” și dispare când scoți evenimentul.

## Propunerea zilei

Dacă ți-ai legat calendarul, ecranul „Azi” poate spune: *„Ai liber de la 17:00 și
îți ia vreo 20 de minute — aspirat sufrageria.”* Regulile ei:

1. o singură propunere pe zi, de om — dacă ai zis „nu azi”, gata pentru azi;
2. numai când chiar încape întreagă între 15:00 și 20:00, nu îndesată între două
   ședințe;
3. numai lucruri deja scadente — nu inventăm treabă ca să umplem timpul liber.

„Pune-o la 17:00” o scrie în calendarul tău, cu durata estimată. Pentru asta e
nevoie ca partajarea calendarului să fie pe „Faceți modificări la evenimente”;
dacă e doar la citire, aplicația spune exact asta și nu se preface că a mers.

## Ecranele

| Ecran | Ce face |
|---|---|
| **Azi** | Ce expiră, ce e în calendar, treburile scadente, declutterul lunii, lista, bugetul. Nimic care nu cere o decizie astăzi. |
| **Listă** | Cumpărăturile, cu preț și total. De aici se ajunge la **Cămară** și la **Catalog**. |
| **Casa** | Zone și treburi · Calendar (grila lunii + listă pe categorii) · Dorințe · Bagaje. |
| **Bani** | Cheltuieli manuale pe orice categorie din buget, plus starea lunii. |
| **Setări** | Calendarul tău Google, notificări, starea legăturii cu bugetul, ieșire din cont. |

## Ceasul: notificările programate

Vercel pe plan gratuit rulează cron o dată pe zi, prea rar pentru remindere la oră
fixă. În schimb, `/api/cron` e gândită să fie chemată des și decide singură ce are
de făcut la ora la care a fost chemată:

- trimite reminderele ajunse la scadență;
- o singură dată pe zi, la `ORA_REZUMAT` (implicit 8, ora României), trimite
  rezumatul zilei.

Pune pe [cron-job.org](https://cron-job.org) (gratis) o chemare din 5 în 5 minute la:

```
https://<adresa-aplicației>/api/cron?cheie=<CHEIE_CRON din .env.local>
```

## Probe

```bash
npm run proba           # așezarea foii de buget și socotelile calendarului
npm run proba:scriere   # în gol pe foaia reală: arată unde ar scrie, nu scrie
```

`npm run proba:scriere -- --chiar` face drumul întreg pe o filă de unică folosință
(`PROBĂ-2099-01`), pe care o șterge la final. Nicio lună reală nu e atinsă.
