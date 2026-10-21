CREATE TABLE `listing_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`outcomeId` varchar(160) NOT NULL,
	`listingId` varchar(255) NOT NULL,
	`kind` enum('sale-observed','price-revised','expired-or-removed','unavailable') NOT NULL,
	`observedAt` timestamp NOT NULL,
	`realizedPrice` double,
	`currency` varchar(3),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listing_outcomes_id` PRIMARY KEY(`id`),
	CONSTRAINT `listing_outcomes_user_outcome_idx` UNIQUE(`userId`,`outcomeId`)
);
--> statement-breakpoint
CREATE INDEX `listing_outcomes_user_observed_idx` ON `listing_outcomes` (`userId`,`observedAt`);