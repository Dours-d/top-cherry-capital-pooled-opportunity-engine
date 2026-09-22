CREATE TABLE `ingestion_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceSlug` varchar(64) NOT NULL,
	`status` enum('queued','completed','failed') NOT NULL DEFAULT 'queued',
	`importedCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `ingestion_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`listingId` varchar(128) NOT NULL,
	`profileSlug` varchar(64) NOT NULL,
	`brand` varchar(128) NOT NULL,
	`model` varchar(255) NOT NULL,
	`askingPrice` int NOT NULL,
	`marketValue` int NOT NULL,
	`score` int NOT NULL,
	`marginPercentage` double NOT NULL,
	`condition` varchar(128) NOT NULL,
	`platformSource` varchar(128) NOT NULL,
	`location` varchar(128),
	`escrowProtected` boolean NOT NULL DEFAULT false,
	`verified` boolean NOT NULL DEFAULT false,
	`url` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_deals_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_deals_user_listing_idx` UNIQUE(`userId`,`listingId`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alertsEnabled` boolean NOT NULL DEFAULT true,
	`dailyDigest` boolean NOT NULL DEFAULT false,
	`scoreThreshold` int NOT NULL DEFAULT 85,
	`marginThreshold` int NOT NULL DEFAULT 20,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `saved_deals_user_created_idx` ON `saved_deals` (`userId`,`createdAt`);