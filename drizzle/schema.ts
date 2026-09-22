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
