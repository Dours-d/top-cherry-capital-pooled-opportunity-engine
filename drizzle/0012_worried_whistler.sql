CREATE TABLE `characteristic_check_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`auditId` varchar(160) NOT NULL,
	`snapshotId` varchar(160) NOT NULL,
	`providerListingId` varchar(255) NOT NULL,
	`action` enum('checked','rechecked') NOT NULL,
	`note` text NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `characteristic_check_audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `characteristic_check_audits_user_audit_idx` UNIQUE(`userId`,`auditId`)
);
--> statement-breakpoint
CREATE INDEX `characteristic_check_audits_user_snapshot_occurred_idx` ON `characteristic_check_audits` (`userId`,`snapshotId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `characteristic_check_audits_user_provider_occurred_idx` ON `characteristic_check_audits` (`userId`,`providerListingId`,`occurredAt`);