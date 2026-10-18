import { boolean, double, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const savedDeals = mysqlTable(
  "saved_deals",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    listingId: varchar("listingId", { length: 128 }).notNull(),
    profileSlug: varchar("profileSlug", { length: 64 }).notNull(),
    brand: varchar("brand", { length: 128 }).notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    askingPrice: int("askingPrice").notNull(),
    marketValue: int("marketValue").notNull(),
    score: int("score").notNull(),
    marginPercentage: double("marginPercentage").notNull(),
    condition: varchar("condition", { length: 128 }).notNull(),
    platformSource: varchar("platformSource", { length: 128 }).notNull(),
    location: varchar("location", { length: 128 }),
    escrowProtected: boolean("escrowProtected").default(false).notNull(),
    verified: boolean("verified").default(false).notNull(),
    url: text("url"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userListingIdx: uniqueIndex("saved_deals_user_listing_idx").on(table.userId, table.listingId),
    userCreatedIdx: index("saved_deals_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export type SavedDeal = typeof savedDeals.$inferSelect;
export type InsertSavedDeal = typeof savedDeals.$inferInsert;

export const userPreferences = mysqlTable(
  "user_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    alertsEnabled: boolean("alertsEnabled").default(true).notNull(),
    dailyDigest: boolean("dailyDigest").default(false).notNull(),
    scoreThreshold: int("scoreThreshold").default(85).notNull(),
    marginThreshold: int("marginThreshold").default(20).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ userIdx: uniqueIndex("user_preferences_user_idx").on(table.userId) }),
);

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

export const thesisDraftRevisions = mysqlTable(
  "thesis_draft_revisions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    draftId: varchar("draftId", { length: 128 }).notNull(),
    revision: int("revision").notNull(),
    status: mysqlEnum("status", ["draft", "submitted", "superseded", "archived"]).notNull(),
    payload: text("payload").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userDraftRevisionIdx: uniqueIndex("thesis_draft_user_revision_idx").on(table.userId, table.draftId, table.revision),
    userDraftIdx: index("thesis_draft_user_idx").on(table.userId, table.draftId),
  }),
);

export type ThesisDraftRevision = typeof thesisDraftRevisions.$inferSelect;
export type InsertThesisDraftRevision = typeof thesisDraftRevisions.$inferInsert;

export const ingestionRuns = mysqlTable("ingestion_runs", {
  id: int("id").autoincrement().primaryKey(),
  sourceSlug: varchar("sourceSlug", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["queued", "completed", "failed"]).default("queued").notNull(),
  importedCount: int("importedCount").default(0).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type IngestionRun = typeof ingestionRuns.$inferSelect;

export const ebayNotificationEvents = mysqlTable(
  "ebay_notification_events",
  {
    id: int("id").autoincrement().primaryKey(),
    notificationId: varchar("notificationId", { length: 255 }).notNull(),
    topic: varchar("topic", { length: 128 }).notNull(),
    signatureKid: varchar("signatureKid", { length: 255 }).notNull(),
    publishAttemptCount: int("publishAttemptCount").default(1).notNull(),
    eventDate: timestamp("eventDate"),
    publishDate: timestamp("publishDate"),
    rawPayload: text("rawPayload").notNull(),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  },
  (table) => ({
    notificationIdIdx: uniqueIndex("ebay_notification_events_notification_id_idx").on(table.notificationId),
    receivedAtIdx: index("ebay_notification_events_received_at_idx").on(table.receivedAt),
  }),
);

export type EbayNotificationEvent = typeof ebayNotificationEvents.$inferSelect;
export type InsertEbayNotificationEvent = typeof ebayNotificationEvents.$inferInsert;

export const ebayListingEvents = mysqlTable(
  "ebay_listing_events",
  {
    id: int("id").autoincrement().primaryKey(),
    eventKey: varchar("eventKey", { length: 255 }).notNull(),
    notificationId: varchar("notificationId", { length: 255 }).notNull(),
    eventType: varchar("eventType", { length: 64 }).notNull(),
    itemId: varchar("itemId", { length: 255 }).notNull(),
    marketplaceId: varchar("marketplaceId", { length: 64 }),
    price: double("price"),
    availability: varchar("availability", { length: 64 }),
    eventDate: timestamp("eventDate"),
    rawPayload: text("rawPayload").notNull(),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  },
  (table) => ({
    eventKeyIdx: uniqueIndex("ebay_listing_events_event_key_idx").on(table.eventKey),
    itemDateIdx: index("ebay_listing_events_item_date_idx").on(table.itemId, table.eventDate),
  }),
);

export type EbayListingEvent = typeof ebayListingEvents.$inferSelect;
export type InsertEbayListingEvent = typeof ebayListingEvents.$inferInsert;
