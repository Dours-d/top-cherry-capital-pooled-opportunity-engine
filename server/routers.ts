import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { MARKETPLACE_SOURCES, previewNormalizedImport } from "./marketplace";
import { systemRouter } from "./_core/systemRouter";
import { z } from "zod";

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
  }),
});

export type AppRouter = typeof appRouter;
