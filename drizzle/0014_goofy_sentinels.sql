CREATE TABLE `evidence_export_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exportId` varchar(160) NOT NULL,
	`action` enum('copied','shared') NOT NULL,
	`format` enum('json','markdown') NOT NULL,
	`privacyMode` enum('redacted','full') NOT NULL,
	`keepTitles` boolean NOT NULL DEFAULT false,
	`keepContext` boolean NOT NULL DEFAULT false,
	`scopeLabel` varchar(255) NOT NULL,
	`eventCount` int NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_export_audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_export_audits_user_export_idx` UNIQUE(`userId`,`exportId`)
);
--> statement-breakpoint
CREATE INDEX `evidence_export_audits_user_occurred_idx` ON `evidence_export_audits` (`userId`,`occurredAt`);