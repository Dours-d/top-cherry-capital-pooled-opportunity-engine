CREATE TABLE `observation_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reviewId` varchar(160) NOT NULL,
	`listingId` varchar(255) NOT NULL,
	`reviewedAt` timestamp NOT NULL,
	`note` text,
	`listingTitle` varchar(255),
	`platform` varchar(128),
	`askingPrice` double,
	`currency` varchar(3),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `observation_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `observation_reviews_user_review_idx` UNIQUE(`userId`,`reviewId`)
);
--> statement-breakpoint
CREATE INDEX `observation_reviews_user_reviewed_idx` ON `observation_reviews` (`userId`,`reviewedAt`);