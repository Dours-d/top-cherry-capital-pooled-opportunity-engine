CREATE TABLE `reconciliation_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`snapshotId` varchar(160) NOT NULL,
	`sourceSlug` varchar(64) NOT NULL,
	`marketplaceId` varchar(64) NOT NULL,
	`query` varchar(255) NOT NULL,
	`providerListingId` varchar(255) NOT NULL,
	`profileSlug` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`askingPrice` double NOT NULL,
	`currency` varchar(3),
	`condition` varchar(128) NOT NULL,
	`location` varchar(255),
	`sellerId` varchar(255),
	`sourceUrl` text,
	`sourceFetchedAt` timestamp NOT NULL,
	`reconciliationStatus` enum('observed','reviewed','superseded') NOT NULL DEFAULT 'observed',
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reconciliation_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `reconciliation_snapshots_user_snapshot_idx` UNIQUE(`userId`,`snapshotId`)
);
--> statement-breakpoint
CREATE INDEX `reconciliation_snapshots_user_captured_idx` ON `reconciliation_snapshots` (`userId`,`capturedAt`);--> statement-breakpoint
CREATE INDEX `reconciliation_snapshots_user_provider_listing_idx` ON `reconciliation_snapshots` (`userId`,`providerListingId`);