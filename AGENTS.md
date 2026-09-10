# Îndrumar pentru lucrul la „Acasă”

Citește întâi `README.md` — stack, pornire, etape.

## Reguli

- **Totul în română**: texte din interfață, nume de fișiere, de funcții, de
  variabile, de tabele și de coloane, plus comentariile. Fără amestec.
- **Mobil întâi.** Se folosește pe iPhone, instalată pe ecranul principal.
  Ținte de atins cu degetul de minimum 44px, câmpuri de 16px (sub atât Safari
  face zoom singur), `env(safe-area-inset-*)` peste tot unde conținutul atinge
  marginile.
- **Sistemul vizual e în `app/globals.css`** și pleacă de la vasele de bucătărie
  emailate: verde smalț cu stropi (`.email`), buză mai închisă la muchii
  (`.buza`), fundal verde-pal ca chitul dintre faianțe. Titluri Fraunces
  (`.titlu`), interfață Instrument Sans, cifre IBM Plex Mono (`.cifre`) — prețurile
  și cantitățile se scriu întotdeauna cu `.cifre`.
  Suprafața emailată e singurul element zgomotos; nu adăuga altele.
- **Nu ștergem rânduri** care au istoric în spate (produse, liste). Marcăm
  `arhivat`/`activ`.
- **Datele calendaristice** sunt text `AAAA-LL-ZZ`; momentele exacte, `integer`
  în secunde. Pentru „azi” folosește `azi()` din `lib/formatare.ts`, nu
  `toISOString()` — seara ar sări o zi.
- **Recurența pleacă de la ultima efectuare**, nu de la o dată fixă. E valabil
  pentru curățenie, pentru ITP și pentru orice altceva se repetă.

## Unde stă ce

```
app/(app)/         ecranele din spatele autentificării, cu navigarea de jos
app/intrare/       ecranul de intrare cu cod
componente/        ce se folosește în mai multe ecrane
lib/db/schema.ts   schema completă, scrisă pentru toate etapele
lib/servicii/      accesul la date și la serviciile externe (Google, Open Food Facts)
lib/sesiune.ts     autentificare, limitarea încercărilor, sesiunea curentă
scripturi/*.mts    pregătire, migrări, coduri de acces, date de pornire
```

Scripturile sunt `.mts` pentru că folosesc `await` la nivel de fișier, iar `tsx`
le rulează ca module ES doar cu extensia asta.

## Bugetul

Foaia `Buget_Familial` din Google e sursa de adevăr, nu aplicația. Structura pe
care ne bazăm: o foaie pe lună, numită `AAAA-LL`, cu un tabel care începe la
rândul `Categorie | Tip | Planificat | Real (Local)` și se termină la
`Total Cheltuieli`. Tranzacțiile se scriu în coloanele H–K ale aceleiași foi, iar
coloana „Real (Local)” se recalculează singură din ele.

Dacă Google nu răspunde, aplicația merge mai departe cu ultima copie locală
(tabelul `buget_lunar`). Bugetul e informativ — nu blochează niciodată un ecran.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
