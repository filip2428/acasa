CREATE TABLE `abonamente_push` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`persoana_id` integer NOT NULL,
	`endpoint` text NOT NULL,
	`cheie_p256dh` text NOT NULL,
	`cheie_auth` text NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	`ultima_reusita_la` integer,
	`esecuri_la_rand` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`persoana_id`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `abonamente_push_endpoint` ON `abonamente_push` (`endpoint`);--> statement-breakpoint
CREATE TABLE `articole_bagaj` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bagaj_id` integer NOT NULL,
	`text` text NOT NULL,
	`categorie` text,
	`pentru_persoana` integer,
	`bifat` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`bagaj_id`) REFERENCES `bagaje`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pentru_persoana`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `articole_bon` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bon_id` integer NOT NULL,
	`text_original` text NOT NULL,
	`produs_id` integer,
	`categorie_id` integer,
	`cantitate` real DEFAULT 1 NOT NULL,
	`pret` real NOT NULL,
	`confirmat` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`bon_id`) REFERENCES `bonuri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`produs_id`) REFERENCES `produse`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categorie_id`) REFERENCES `categorii`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `articole_lista` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lista_id` integer NOT NULL,
	`produs_id` integer,
	`text` text,
	`cantitate` real DEFAULT 1 NOT NULL,
	`unitate` text DEFAULT 'buc' NOT NULL,
	`pret_estimat` real,
	`bifat` integer DEFAULT false NOT NULL,
	`bifat_de` integer,
	`bifat_la` integer,
	`adaugat_de` integer,
	`adaugat_la` integer DEFAULT (unixepoch()) NOT NULL,
	`sursa` text DEFAULT 'manual' NOT NULL,
	`reteta_id` integer,
	FOREIGN KEY (`lista_id`) REFERENCES `liste`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`produs_id`) REFERENCES `produse`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bifat_de`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`adaugat_de`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `articole_lista_lista` ON `articole_lista` (`lista_id`);--> statement-breakpoint
CREATE TABLE `articole_sablon_bagaj` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sablon_id` integer NOT NULL,
	`text` text NOT NULL,
	`categorie` text,
	`ordine` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sablon_id`) REFERENCES `sabloane_bagaj`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bagaje` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sablon_id` integer,
	`nume` text NOT NULL,
	`data_plecare` text,
	`data_intoarcere` text,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`sablon_id`) REFERENCES `sabloane_bagaj`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bonuri` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`magazin_id` integer,
	`data` text,
	`total` real,
	`poza_url` text,
	`stare` text DEFAULT 'nou' NOT NULL,
	`raspuns_ai` text,
	`eroare` text,
	`trimis_in_buget_la` integer,
	`adaugat_de` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`magazin_id`) REFERENCES `magazine`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`adaugat_de`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `buget_lunar` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`luna` text NOT NULL,
	`categorie` text NOT NULL,
	`planificat` real DEFAULT 0 NOT NULL,
	`real` real DEFAULT 0 NOT NULL,
	`actualizat_la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buget_luna_categorie` ON `buget_lunar` (`luna`,`categorie`);--> statement-breakpoint
CREATE TABLE `categorii` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`ordine` integer DEFAULT 0 NOT NULL,
	`categorie_buget` text,
	`activ` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cicluri` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`persoana_id` integer NOT NULL,
	`inceput` text NOT NULL,
	`sfarsit` text,
	`notite` text,
	FOREIGN KEY (`persoana_id`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cicluri_persoana_inceput` ON `cicluri` (`persoana_id`,`inceput`);--> statement-breakpoint
CREATE TABLE `dorinte` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titlu` text NOT NULL,
	`url` text,
	`pret` real,
	`categorie` text,
	`prioritate` integer DEFAULT 2 NOT NULL,
	`poza_url` text,
	`notite` text,
	`stare` text DEFAULT 'idee' NOT NULL,
	`creat_de` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creat_de`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `efectuari` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sarcina_id` integer NOT NULL,
	`persoana_id` integer,
	`data` text NOT NULL,
	`minute_reale` integer,
	`notite` text,
	FOREIGN KEY (`sarcina_id`) REFERENCES `sarcini`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`persoana_id`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `efectuari_sarcina_data` ON `efectuari` (`sarcina_id`,`data`);--> statement-breakpoint
CREATE TABLE `evenimente` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titlu` text NOT NULL,
	`categorie` text DEFAULT 'casa' NOT NULL,
	`data` text,
	`recurenta_luni` integer,
	`ultima_efectuare_la` text,
	`remindere_zile_inainte` integer DEFAULT 7 NOT NULL,
	`notite` text,
	`activ` integer DEFAULT true NOT NULL,
	`creat_de` integer,
	FOREIGN KEY (`creat_de`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `evenimente_data` ON `evenimente` (`data`);--> statement-breakpoint
CREATE TABLE `incercari_autentificare` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cheie` text NOT NULL,
	`la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `incercari_cheie_la` ON `incercari_autentificare` (`cheie`,`la`);--> statement-breakpoint
CREATE TABLE `ingrediente_reteta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reteta_id` integer NOT NULL,
	`text_original` text NOT NULL,
	`produs_id` integer,
	`cantitate` real,
	`unitate` text,
	`optional` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`reteta_id`) REFERENCES `retete`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`produs_id`) REFERENCES `produse`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `liste` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text DEFAULT 'Cumpărături' NOT NULL,
	`magazin_id` integer,
	`finalizata_la` integer,
	`total_real` real,
	`trimis_in_buget_la` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`magazin_id`) REFERENCES `magazine`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `magazine` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`activ` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `persoane` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`cod_public` text NOT NULL,
	`cod_hash` text NOT NULL,
	`este_admin` integer DEFAULT false NOT NULL,
	`activ` integer DEFAULT true NOT NULL,
	`calendar_google_id` text,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persoane_cod_public` ON `persoane` (`cod_public`);--> statement-breakpoint
CREATE TABLE `plan_mese` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`moment` text DEFAULT 'cina' NOT NULL,
	`reteta_id` integer,
	`text_liber` text,
	`portii` integer,
	`gatit_de` integer,
	`gatit_la` integer,
	FOREIGN KEY (`reteta_id`) REFERENCES `retete`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gatit_de`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `plan_mese_data` ON `plan_mese` (`data`);--> statement-breakpoint
CREATE TABLE `preturi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`produs_id` integer NOT NULL,
	`magazin_id` integer,
	`pret` real NOT NULL,
	`cantitate` real DEFAULT 1 NOT NULL,
	`unitate` text DEFAULT 'buc' NOT NULL,
	`data` text NOT NULL,
	`sursa` text DEFAULT 'manual' NOT NULL,
	FOREIGN KEY (`produs_id`) REFERENCES `produse`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`magazin_id`) REFERENCES `magazine`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `preturi_produs_data` ON `preturi` (`produs_id`,`data`);--> statement-breakpoint
CREATE TABLE `produse` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`categorie_id` integer,
	`unitate` text DEFAULT 'buc' NOT NULL,
	`cantitate_implicita` real DEFAULT 1 NOT NULL,
	`cod_bare` text,
	`poza_url` text,
	`pret_ultim` real,
	`magazin_ultim_id` integer,
	`zile_valabilitate` integer,
	`ritm_zile` real,
	`ultima_cumparare_la` text,
	`arhivat` integer DEFAULT false NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`categorie_id`) REFERENCES `categorii`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`magazin_ultim_id`) REFERENCES `magazine`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `produse_nume` ON `produse` (`nume`);--> statement-breakpoint
CREATE UNIQUE INDEX `produse_cod_bare` ON `produse` (`cod_bare`);--> statement-breakpoint
CREATE TABLE `propuneri` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`persoana_id` integer NOT NULL,
	`sarcina_id` integer,
	`ora_start` text,
	`minute` integer,
	`stare` text DEFAULT 'propus' NOT NULL,
	`raspuns_la` integer,
	`eveniment_google_id` text,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`persoana_id`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sarcina_id`) REFERENCES `sarcini`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `propuneri_data_persoana` ON `propuneri` (`data`,`persoana_id`);--> statement-breakpoint
CREATE TABLE `remindere` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`de_la` integer NOT NULL,
	`catre` integer NOT NULL,
	`text` text NOT NULL,
	`cand` integer NOT NULL,
	`trimis_la` integer,
	`vazut_la` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`de_la`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catre`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `remindere_cand` ON `remindere` (`cand`,`trimis_la`);--> statement-breakpoint
CREATE TABLE `retete` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titlu` text NOT NULL,
	`sursa` text DEFAULT 'manual' NOT NULL,
	`sursa_id` text,
	`url` text,
	`poza_url` text,
	`portii` integer DEFAULT 2 NOT NULL,
	`minute_total` integer,
	`la_tm6` integer DEFAULT false NOT NULL,
	`efort` text DEFAULT 'mediu' NOT NULL,
	`etichete` text DEFAULT '[]' NOT NULL,
	`instructiuni` text,
	`favorit` integer DEFAULT false NOT NULL,
	`sincronizat_la` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `retete_sursa` ON `retete` (`sursa`,`sursa_id`);--> statement-breakpoint
CREATE TABLE `sabloane_bagaj` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`notite` text
);
--> statement-breakpoint
CREATE TABLE `sarcini` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`zona_id` integer,
	`titlu` text NOT NULL,
	`descriere` text,
	`tip` text DEFAULT 'curatenie' NOT NULL,
	`frecventa_zile` integer,
	`minute_estimate` integer DEFAULT 20 NOT NULL,
	`efort` text DEFAULT 'mediu' NOT NULL,
	`atribuit_lui` integer,
	`rotatie` integer DEFAULT false NOT NULL,
	`ultima_efectuare_la` text,
	`urmatoarea_la` text,
	`evita_la_menstruatie` integer DEFAULT false NOT NULL,
	`activ` integer DEFAULT true NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`zona_id`) REFERENCES `zone`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`atribuit_lui`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sarcini_urmatoarea` ON `sarcini` (`urmatoarea_la`);--> statement-breakpoint
CREATE TABLE `setari` (
	`cheie` text PRIMARY KEY NOT NULL,
	`valoare` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `setari_persoana` (
	`persoana_id` integer NOT NULL,
	`cheie` text NOT NULL,
	`valoare` text NOT NULL,
	FOREIGN KEY (`persoana_id`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setari_persoana_cheie` ON `setari_persoana` (`persoana_id`,`cheie`);--> statement-breakpoint
CREATE TABLE `stari_zilnice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`persoana_id` integer NOT NULL,
	`data` text NOT NULL,
	`energie` integer,
	`simptome` text,
	`notite` text,
	FOREIGN KEY (`persoana_id`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stari_persoana_data` ON `stari_zilnice` (`persoana_id`,`data`);--> statement-breakpoint
CREATE TABLE `stoc` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`produs_id` integer NOT NULL,
	`cantitate` real DEFAULT 1 NOT NULL,
	`unitate` text DEFAULT 'buc' NOT NULL,
	`loc` text DEFAULT 'camara' NOT NULL,
	`expira_la` text,
	`adaugat_la` text NOT NULL,
	`adaugat_de` integer,
	`consumat_la` integer,
	`notite` text,
	FOREIGN KEY (`produs_id`) REFERENCES `produse`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`adaugat_de`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stoc_expira` ON `stoc` (`expira_la`);--> statement-breakpoint
CREATE INDEX `stoc_produs` ON `stoc` (`produs_id`);--> statement-breakpoint
CREATE TABLE `zone` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`ordine` integer DEFAULT 0 NOT NULL,
	`ordine_declutter` integer,
	`ultimul_declutter_la` text,
	`activ` integer DEFAULT true NOT NULL
);
