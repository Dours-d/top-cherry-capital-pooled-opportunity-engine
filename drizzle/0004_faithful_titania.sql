CREATE TABLE `thesis_draft_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`draftId` varchar(128) NOT NULL,
	`revision` int NOT NULL,
	`status` enum('draft','submitted','superseded','archived') NOT NULL,
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thesis_draft_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `thesis_draft_user_revision_idx` UNIQUE(`userId`,`draftId`,`revision`)
);
--> statement-breakpoint
CREATE INDEX `thesis_draft_user_idx` ON `thesis_draft_revisions` (`userId`,`draftId`);