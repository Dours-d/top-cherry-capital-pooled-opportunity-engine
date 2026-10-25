CREATE TABLE `provider_read_retry_resets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resetId` varchar(160) NOT NULL,
	`providerListingId` varchar(255) NOT NULL,
	`previousAttemptCount` int NOT NULL,
	`note` text NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provider_read_retry_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_read_retry_resets_user_reset_idx` UNIQUE(`userId`,`resetId`)
);
--> statement-breakpoint
CREATE INDEX `provider_read_retry_resets_user_provider_occurred_idx` ON `provider_read_retry_resets` (`userId`,`providerListingId`,`occurredAt`);