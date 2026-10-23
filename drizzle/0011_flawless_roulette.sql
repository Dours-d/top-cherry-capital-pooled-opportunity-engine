ALTER TABLE `reconciliation_snapshots` ADD `characteristicsChecked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `reconciliation_snapshots` ADD `characteristicsCheckedAt` timestamp;--> statement-breakpoint
ALTER TABLE `reconciliation_snapshots` ADD `characteristicsCheckNote` text;