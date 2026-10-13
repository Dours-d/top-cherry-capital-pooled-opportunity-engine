CREATE TABLE `ebay_listing_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventKey` varchar(255) NOT NULL,
	`notificationId` varchar(255) NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`itemId` varchar(255) NOT NULL,
	`marketplaceId` varchar(64),
	`price` double,
	`availability` varchar(64),
	`eventDate` timestamp,
	`rawPayload` text NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ebay_listing_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `ebay_listing_events_event_key_idx` UNIQUE(`eventKey`)
);
--> statement-breakpoint
CREATE INDEX `ebay_listing_events_item_date_idx` ON `ebay_listing_events` (`itemId`,`eventDate`);