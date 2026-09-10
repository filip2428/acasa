CREATE TABLE `tranzactii` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`luna` text NOT NULL,
	`data` text NOT NULL,
	`categorie` text NOT NULL,
	`suma` real NOT NULL,
	`descriere` text,
	`sursa` text DEFAULT 'manual' NOT NULL,
	`lista_id` integer,
	`bon_id` integer,
	`adaugat_de` integer,
	`rand_sheet` integer,
	`trimis_la` integer,
	`eroare` text,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lista_id`) REFERENCES `liste`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bon_id`) REFERENCES `bonuri`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`adaugat_de`) REFERENCES `persoane`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tranzactii_luna` ON `tranzactii` (`luna`);--> statement-breakpoint
CREATE INDEX `tranzactii_trimis` ON `tranzactii` (`trimis_la`);