CREATE TABLE `ebay_notification_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` varchar(255) NOT NULL,
	`topic` varchar(128) NOT NULL,
	`signatureKid` varchar(255) NOT NULL,
	`publishAttemptCount` int NOT NULL DEFAULT 1,
	`eventDate` timestamp,
	`publishDate` timestamp,
	`rawPayload` text NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ebay_notification_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `ebay_notification_events_notification_id_idx` UNIQUE(`notificationId`)
);
--> statement-breakpoint
CREATE INDEX `ebay_notification_events_received_at_idx` ON `ebay_notification_events` (`receivedAt`);