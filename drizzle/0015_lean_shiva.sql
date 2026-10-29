CREATE TABLE `research_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceSlug` varchar(64) NOT NULL,
	`marketplaceId` varchar(64) NOT NULL,
	`providerListingId` varchar(255) NOT NULL,
	`profileSlug` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`askingPrice` double NOT NULL,
	`currency` varchar(3),
	`condition` varchar(128) NOT NULL,
	`location` varchar(255),
	`sellerId` varchar(255),
	`sourceUrl` text,
	`latestSnapshotId` varchar(160) NOT NULL,
	`firstObservedAt` timestamp NOT NULL,
	`lastObservedAt` timestamp NOT NULL,
	`observationCount` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_listings_id` PRIMARY KEY(`id`),
	CONSTRAINT `research_listings_user_marketplace_provider_idx` UNIQUE(`userId`,`marketplaceId`,`providerListingId`)
);
--> statement-breakpoint
CREATE INDEX `research_listings_user_last_observed_idx` ON `research_listings` (`userId`,`lastObservedAt`);