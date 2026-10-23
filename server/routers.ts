import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { MARKETPLACE_SOURCES, getEbayBrowseItem, previewNormalizedImport, searchEbayBrowse } from "./marketplace";
import { systemRouter } from "./_core/systemRouter";
import { z } from "zod";
import { getEbaySubscriptionState } from "./ebay-monitoring";
import { summarizeEbayMarketSignals } from "../shared/ebay-signals";
import { thesisDraftSchema } from "../shared/versioned-drafts";

const savedDealInput = z.object({
  listingId: z.string().min(1).max(128),
  profileSlug: z.string().min(1).max(64),
  brand: z.string().min(1).max(128),
  model: z.string().min(1).max(255),
  askingPrice: z.number().int().nonnegative(),
  marketValue: z.number().int().nonnegative(),
  score: z.number().int().min(0).max(100),
  marginPercentage: z.number(),
  condition: z.string().min(1).max(128),
  platformSource: z.string().min(1).max(128),
  location: z.string().max(128).optional(),
  escrowProtected: z.boolean().default(false),
  verified: z.boolean().default(false),
  url: z.string().url().optional(),
});

const normalizedListingInput = savedDealInput.omit({ score: true, marginPercentage: true }).extend({
  listingId: z.string().min(1).max(128),
});

const thesisRevisionInput = z.object({
  draftId: z.string().min(1).max(128),
  revision: z.number().int().positive(),
  status: z.enum(["draft", "submitted", "superseded", "archived"]),
  payload: thesisDraftSchema,
});

const observationReviewInput = z.object({
  reviewId: z.string().min(1).max(160),
  listingId: z.string().min(1).max(255),
  reviewedAt: z.string().datetime(),
  note: z.string().max(1000).optional(),
  listingTitle: z.string().max(255).optional(),
  platform: z.string().max(128).optional(),
  askingPrice: z.number().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
});

const listingOutcomeInput = z.object({
  outcomeId: z.string().min(1).max(160),
  listingId: z.string().min(1).max(255),
  kind: z.enum(["sale-observed", "price-revised", "expired-or-removed", "unavailable"]),
  observedAt: z.string().datetime(),
  realizedPrice: z.number().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  note: z.string().max(1000).optional(),
});

const outcomeSyncAuditInput = z.object({
  auditId: z.string().min(1).max(160),
  outcomeId: z.string().min(1).max(160),
  action: z.enum(["dismissed", "restored"]),
  occurredAt: z.string().datetime(),
  note: z.string().min(1).max(1000),
});

const reconciliationSnapshotInput = z.object({
  snapshotId: z.string().min(1).max(160),
  sourceSlug: z.string().min(1).max(64),
  marketplaceId: z.string().regex(/^EBAY_[A-Z]{2}$/),
  query: z.string().min(2).max(255),
  providerListingId: z.string().min(1).max(255),
  profileSlug: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  askingPrice: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  condition: z.string().min(1).max(128),
  location: z.string().max(255).optional(),
  sellerId: z.string().max(255).optional(),
  sourceUrl: z.string().url().optional(),
  sourceFetchedAt: z.string().datetime(),
  reconciliationStatus: z.enum(["observed", "reviewed", "superseded"]).default("observed"),
});

const reconciliationSnapshotReviewInput = z.object({
  snapshotId: z.string().min(1).max(160),
  reconciliationStatus: z.enum(["reviewed", "superseded"]),
  reviewNote: z.string().min(1).max(1000),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  savedDeals: router({
    list: protectedProcedure.query(({ ctx }) => db.listSavedDeals(ctx.user.id)),
    toggle: protectedProcedure.input(savedDealInput).mutation(async ({ ctx, input }) => {
      const existing = await db.findSavedDeal(ctx.user.id, input.listingId);
      if (existing) {
        await db.deleteSavedDeal(ctx.user.id, input.listingId);
        return { saved: false, listingId: input.listingId };
      }
      const saved = await db.createSavedDeal({ userId: ctx.user.id, ...input });
      return { saved: true, listingId: input.listingId, deal: saved };
    }),
  }),
  preferences: router({
    get: protectedProcedure.query(({ ctx }) => db.getUserPreferences(ctx.user.id)),
    update: protectedProcedure.input(z.object({
      alertsEnabled: z.boolean().optional(),
      dailyDigest: z.boolean().optional(),
      scoreThreshold: z.number().int().min(0).max(100).optional(),
      marginThreshold: z.number().int().min(-100).max(100).optional(),
    })).mutation(({ ctx, input }) => db.updateUserPreferences(ctx.user.id, input)),
  }),
  alerts: router({
    preview: protectedProcedure.input(z.object({ listings: z.array(z.object({ listingId: z.string(), score: z.number(), marginPercentage: z.number() })) })).query(async ({ ctx, input }) => {
      const preferences = await db.getUserPreferences(ctx.user.id);
      return input.listings.filter((listing) => preferences.alertsEnabled && listing.score >= preferences.scoreThreshold && listing.marginPercentage >= preferences.marginThreshold);
    }),
  }),
  marketplace: router({
    sources: publicProcedure.query(() => MARKETPLACE_SOURCES),
    previewImport: protectedProcedure.input(z.object({ sourceSlug: z.string(), listings: z.array(normalizedListingInput).max(500) })).mutation(({ input }) => previewNormalizedImport(input.sourceSlug, input.listings)),
    searchEbay: publicProcedure.input(z.object({ query: z.string().min(2).max(120), marketplaceId: z.string().regex(/^EBAY_[A-Z]{2}$/).optional(), categoryId: z.string().regex(/^\d+$/).optional(), limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).max(10000).optional() })).query(({ input }) => searchEbayBrowse(input)),
    getEbayItem: publicProcedure.input(z.object({ itemId: z.string().min(3).max(255), marketplaceId: z.string().regex(/^EBAY_[A-Z]{2}$/).optional() })).query(({ input }) => getEbayBrowseItem(input)),
  }),
  thesisDrafts: router({
    list: protectedProcedure.input(z.object({ draftId: z.string().min(1).max(128) })).query(async ({ ctx, input }) => (await db.listThesisDraftRevisions(ctx.user.id, input.draftId)).map((row) => ({ ...row, payload: JSON.parse(row.payload) }))),
    upsert: protectedProcedure.input(thesisRevisionInput).mutation(({ ctx, input }) => db.upsertThesisDraftRevision({ userId: ctx.user.id, draftId: input.draftId, revision: input.revision, status: input.status, payload: JSON.stringify(input.payload) })),
    reviews: protectedProcedure.input(z.object({ draftId: z.string().min(1).max(128) })).query(({ ctx, input }) => db.listThesisContradictionReviews(ctx.user.id, input.draftId)),
    review: protectedProcedure.input(z.object({ draftId: z.string().min(1).max(128), revision: z.number().int().positive(), contradictionKey: z.string().min(1).max(255), status: z.enum(["open", "resolved"]), reviewer: z.string().min(1).max(160).nullable(), resolvedAt: z.string().datetime().nullable() })).mutation(({ ctx, input }) => db.upsertThesisContradictionReview({ userId: ctx.user.id, ...input, resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null })),
  }),
  observationReviews: router({
    list: protectedProcedure.query(({ ctx }) => db.listObservationReviews(ctx.user.id)),
    upsert: protectedProcedure.input(observationReviewInput).mutation(({ ctx, input }) => db.upsertObservationReview({ userId: ctx.user.id, ...input, reviewedAt: new Date(input.reviewedAt) })),
  }),
  listingOutcomes: router({
    list: protectedProcedure.query(({ ctx }) => db.listListingOutcomes(ctx.user.id)),
    upsert: protectedProcedure.input(listingOutcomeInput).mutation(({ ctx, input }) => db.upsertListingOutcome({ userId: ctx.user.id, ...input, observedAt: new Date(input.observedAt) })),
  }),
  outcomeSyncAudits: router({
    list: protectedProcedure.query(({ ctx }) => db.listOutcomeSyncAudits(ctx.user.id)),
    upsert: protectedProcedure.input(outcomeSyncAuditInput).mutation(({ ctx, input }) => db.upsertOutcomeSyncAudit({ userId: ctx.user.id, ...input, occurredAt: new Date(input.occurredAt) })),
  }),
  reconciliationSnapshots: router({
    list: protectedProcedure.query(({ ctx }) => db.listReconciliationSnapshots(ctx.user.id)),
    upsert: protectedProcedure.input(reconciliationSnapshotInput).mutation(({ ctx, input }) => db.upsertReconciliationSnapshot({ userId: ctx.user.id, ...input, sourceFetchedAt: new Date(input.sourceFetchedAt) })),
    review: protectedProcedure.input(reconciliationSnapshotReviewInput).mutation(({ ctx, input }) => db.reviewReconciliationSnapshot(ctx.user.id, input.snapshotId, input.reconciliationStatus, input.reviewNote, new Date())),
  }),
  monitoring: router({
    ebay: publicProcedure.query(async () => {
      const [summary, signals, subscriptions] = await Promise.all([db.getEbayNotificationSummary(), db.getEbayMarketSignals(), getEbaySubscriptionState()]);
      return { summary, market: summarizeEbayMarketSignals(signals), subscriptions, observationWindow: "Latest 200 verified listing events; not a marketplace-wide estimate", checkedAt: new Date() };
    }),
    listingSignals: protectedProcedure.query(async () => (await db.getEbayMarketSignals()).slice(0, 8)),
  }),
});

export type AppRouter = typeof appRouter;
