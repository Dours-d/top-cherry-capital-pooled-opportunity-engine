CREATE TABLE `outcome_sync_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`auditId` varchar(160) NOT NULL,
	`outcomeId` varchar(160) NOT NULL,
	`action` enum('dismissed','restored') NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outcome_sync_audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `outcome_sync_audits_user_audit_idx` UNIQUE(`userId`,`auditId`)
);
--> statement-breakpoint
CREATE INDEX `outcome_sync_audits_user_occurred_idx` ON `outcome_sync_audits` (`userId`,`occurredAt`);