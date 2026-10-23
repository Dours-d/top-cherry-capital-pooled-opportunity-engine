import { and, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ebayListingEvents, ebayNotificationEvents, InsertEbayListingEvent, InsertEbayNotificationEvent, InsertListingOutcome, InsertObservationReview, InsertOutcomeSyncAudit, InsertReconciliationSnapshot, InsertSavedDeal, InsertThesisContradictionReview, InsertThesisDraftRevision, InsertUser, listingOutcomes, observationReviews, outcomeSyncAudits, reconciliationSnapshots, savedDeals, thesisContradictionReviews, thesisDraftRevisions, userPreferences, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildEbayMarketSignals } from "../shared/ebay-signals";

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

export async function upsertThesisDraftRevision(revision: InsertThesisDraftRevision) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(thesisDraftRevisions).values(revision).onDuplicateKeyUpdate({ set: { status: revision.status, payload: revision.payload } });
  const result = await db.select().from(thesisDraftRevisions).where(and(eq(thesisDraftRevisions.userId, revision.userId), eq(thesisDraftRevisions.draftId, revision.draftId), eq(thesisDraftRevisions.revision, revision.revision))).limit(1);
  return result[0];
}

export async function listThesisDraftRevisions(userId: number, draftId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(thesisDraftRevisions).where(and(eq(thesisDraftRevisions.userId, userId), eq(thesisDraftRevisions.draftId, draftId))).orderBy(thesisDraftRevisions.revision);
}

export async function upsertThesisContradictionReview(review: InsertThesisContradictionReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(thesisContradictionReviews).values(review).onDuplicateKeyUpdate({ set: { status: review.status, reviewer: review.reviewer, resolvedAt: review.resolvedAt } });
  const result = await db.select().from(thesisContradictionReviews).where(and(eq(thesisContradictionReviews.userId, review.userId), eq(thesisContradictionReviews.draftId, review.draftId), eq(thesisContradictionReviews.revision, review.revision), eq(thesisContradictionReviews.contradictionKey, review.contradictionKey))).limit(1);
  return result[0];
}

export async function listThesisContradictionReviews(userId: number, draftId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(thesisContradictionReviews).where(and(eq(thesisContradictionReviews.userId, userId), eq(thesisContradictionReviews.draftId, draftId))).orderBy(desc(thesisContradictionReviews.createdAt));
}

export async function upsertObservationReview(review: InsertObservationReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(observationReviews).values(review).onDuplicateKeyUpdate({ set: { listingId: review.listingId, reviewedAt: review.reviewedAt, note: review.note ?? null, listingTitle: review.listingTitle ?? null, platform: review.platform ?? null, askingPrice: review.askingPrice ?? null, currency: review.currency ?? null } });
  const result = await db.select().from(observationReviews).where(and(eq(observationReviews.userId, review.userId), eq(observationReviews.reviewId, review.reviewId))).limit(1);
  return result[0];
}

export async function listObservationReviews(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(observationReviews).where(eq(observationReviews.userId, userId)).orderBy(desc(observationReviews.reviewedAt)).limit(limit);
}

export async function upsertListingOutcome(outcome: InsertListingOutcome) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(listingOutcomes).values(outcome).onDuplicateKeyUpdate({ set: { listingId: outcome.listingId, kind: outcome.kind, observedAt: outcome.observedAt, realizedPrice: outcome.realizedPrice ?? null, currency: outcome.currency ?? null, note: outcome.note ?? null } });
  const result = await db.select().from(listingOutcomes).where(and(eq(listingOutcomes.userId, outcome.userId), eq(listingOutcomes.outcomeId, outcome.outcomeId))).limit(1);
  return result[0];
}

export async function listListingOutcomes(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(listingOutcomes).where(eq(listingOutcomes.userId, userId)).orderBy(desc(listingOutcomes.observedAt)).limit(limit);
}

export async function upsertOutcomeSyncAudit(audit: InsertOutcomeSyncAudit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(outcomeSyncAudits).values(audit).onDuplicateKeyUpdate({ set: { outcomeId: audit.outcomeId, action: audit.action, occurredAt: audit.occurredAt, note: audit.note } });
  const result = await db.select().from(outcomeSyncAudits).where(and(eq(outcomeSyncAudits.userId, audit.userId), eq(outcomeSyncAudits.auditId, audit.auditId))).limit(1);
  return result[0];
}

export async function listOutcomeSyncAudits(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outcomeSyncAudits).where(eq(outcomeSyncAudits.userId, userId)).orderBy(desc(outcomeSyncAudits.occurredAt)).limit(limit);
}

export async function upsertReconciliationSnapshot(snapshot: InsertReconciliationSnapshot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reconciliationSnapshots).values(snapshot).onDuplicateKeyUpdate({ set: { sourceSlug: snapshot.sourceSlug, marketplaceId: snapshot.marketplaceId, query: snapshot.query, providerListingId: snapshot.providerListingId, profileSlug: snapshot.profileSlug, title: snapshot.title, askingPrice: snapshot.askingPrice, currency: snapshot.currency ?? null, condition: snapshot.condition, location: snapshot.location ?? null, sellerId: snapshot.sellerId ?? null, sourceUrl: snapshot.sourceUrl ?? null, sourceFetchedAt: snapshot.sourceFetchedAt, reconciliationStatus: snapshot.reconciliationStatus } });
  const result = await db.select().from(reconciliationSnapshots).where(and(eq(reconciliationSnapshots.userId, snapshot.userId), eq(reconciliationSnapshots.snapshotId, snapshot.snapshotId))).limit(1);
  return result[0];
}

export async function listReconciliationSnapshots(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reconciliationSnapshots).where(eq(reconciliationSnapshots.userId, userId)).orderBy(desc(reconciliationSnapshots.capturedAt)).limit(limit);
}

export async function reviewReconciliationSnapshot(userId: number, snapshotId: string, reconciliationStatus: "reviewed" | "superseded", reviewNote: string, reviewedAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reconciliationSnapshots).set({ reconciliationStatus, reviewNote, reviewedAt }).where(and(eq(reconciliationSnapshots.userId, userId), eq(reconciliationSnapshots.snapshotId, snapshotId)));
  const result = await db.select().from(reconciliationSnapshots).where(and(eq(reconciliationSnapshots.userId, userId), eq(reconciliationSnapshots.snapshotId, snapshotId))).limit(1);
  return result[0];
}

export async function checkReconciliationSnapshotCharacteristics(userId: number, snapshotId: string, note: string, checkedAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reconciliationSnapshots).set({ characteristicsChecked: true, characteristicsCheckedAt: checkedAt, characteristicsCheckNote: note }).where(and(eq(reconciliationSnapshots.userId, userId), eq(reconciliationSnapshots.snapshotId, snapshotId)));
  const result = await db.select().from(reconciliationSnapshots).where(and(eq(reconciliationSnapshots.userId, userId), eq(reconciliationSnapshots.snapshotId, snapshotId))).limit(1);
  return result[0];
}

export async function insertEbayNotificationEvent(event: InsertEbayNotificationEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(ebayNotificationEvents).values(event).onDuplicateKeyUpdate({ set: { notificationId: event.notificationId } });
  const result = await db.select().from(ebayNotificationEvents).where(eq(ebayNotificationEvents.notificationId, event.notificationId)).limit(1);
  return result[0];
}

export async function insertEbayListingEvent(event: InsertEbayListingEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(ebayListingEvents).values(event).onDuplicateKeyUpdate({ set: { eventKey: event.eventKey } });
  const result = await db.select().from(ebayListingEvents).where(eq(ebayListingEvents.eventKey, event.eventKey)).limit(1);
  return result[0];
}

export async function getEbayNotificationSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [notifications, listingEvents, latest] = await Promise.all([
    db.select({ value: count() }).from(ebayNotificationEvents),
    db.select({ value: count() }).from(ebayListingEvents),
    db.select({ topic: ebayNotificationEvents.topic, receivedAt: ebayNotificationEvents.receivedAt }).from(ebayNotificationEvents).orderBy(desc(ebayNotificationEvents.receivedAt)).limit(1),
  ]);
  return { notifications: Number(notifications[0]?.value ?? 0), listingEvents: Number(listingEvents[0]?.value ?? 0), lastReceivedAt: latest[0]?.receivedAt ?? null, latestTopic: latest[0]?.topic ?? null };
}

export async function listRecentEbayListingEvents(limit = 8) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select({ eventType: ebayListingEvents.eventType, itemId: ebayListingEvents.itemId, price: ebayListingEvents.price, availability: ebayListingEvents.availability, eventDate: ebayListingEvents.eventDate, receivedAt: ebayListingEvents.receivedAt }).from(ebayListingEvents).orderBy(desc(ebayListingEvents.receivedAt)).limit(limit);
}

export async function getEbayMarketSignals() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(ebayListingEvents).orderBy(desc(ebayListingEvents.receivedAt)).limit(200);
  return buildEbayMarketSignals(rows.map((row) => {
    let currency: string | null = null;
    try {
      const data = JSON.parse(row.rawPayload)?.notification?.data;
      const candidate = data?.price?.currency ?? data?.currentPrice?.currency ?? data?.currency;
      if (typeof candidate === "string" && /^[A-Z]{3}$/.test(candidate)) currency = candidate;
    } catch { /* A legacy payload has no reliable currency; comparisons remain unknown. */ }
    return { eventKey: row.eventKey, eventType: row.eventType, itemId: row.itemId, marketplaceId: row.marketplaceId, price: row.price, availability: row.availability, currency, eventDate: row.eventDate, receivedAt: row.receivedAt };
  }));
}
