CREATE TABLE `thesis_contradiction_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`draftId` varchar(128) NOT NULL,
	`revision` int NOT NULL,
	`contradictionKey` varchar(255) NOT NULL,
	`status` enum('open','resolved') NOT NULL,
	`reviewer` varchar(160),
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thesis_contradiction_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `thesis_contradiction_review_key_idx` UNIQUE(`userId`,`draftId`,`revision`,`contradictionKey`)
);
--> statement-breakpoint
CREATE INDEX `thesis_contradiction_review_draft_idx` ON `thesis_contradiction_reviews` (`userId`,`draftId`);