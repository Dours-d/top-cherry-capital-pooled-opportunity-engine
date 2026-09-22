import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertSavedDeal, InsertUser, savedDeals, userPreferences, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listSavedDeals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedDeals).where(eq(savedDeals.userId, userId)).orderBy(desc(savedDeals.createdAt));
}

export async function findSavedDeal(userId: number, listingId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(savedDeals).where(and(eq(savedDeals.userId, userId), eq(savedDeals.listingId, listingId))).limit(1);
  return result[0];
}

export async function createSavedDeal(deal: InsertSavedDeal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(savedDeals).values(deal);
  return findSavedDeal(deal.userId, deal.listingId);
}

export async function deleteSavedDeal(userId: number, listingId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(savedDeals).where(and(eq(savedDeals.userId, userId), eq(savedDeals.listingId, listingId)));
}

export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return { alertsEnabled: true, dailyDigest: false, scoreThreshold: 85, marginThreshold: 20 };
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (result[0]) return result[0];
  await db.insert(userPreferences).values({ userId });
  const created = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return created[0];
}

export async function updateUserPreferences(userId: number, values: Partial<typeof userPreferences.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await getUserPreferences(userId);
  await db.update(userPreferences).set({ ...values, updatedAt: new Date() }).where(eq(userPreferences.userId, userId));
  return getUserPreferences(userId);
}
