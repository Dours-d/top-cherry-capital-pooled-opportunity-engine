import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";
vi.mock("../server/db", () => ({ getEbayNotificationSummary: vi.fn(), getEbayMarketSignals: vi.fn() }));
vi.mock("../server/ebay-monitoring", () => ({ getEbaySubscriptionState: vi.fn() }));
import * as db from "../server/db";
import { getEbaySubscriptionState } from "../server/ebay-monitoring";
import { appRouter } from "../server/routers";
const context = (signedIn = false) => ({ user: signedIn ? { id: 1, role: "user", openId: "test" } : null, req: { headers: {} }, res: {} } as TrpcContext);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.getEbayNotificationSummary).mockResolvedValue({ notifications: 15, listingEvents: 0, lastReceivedAt: new Date("2026-10-13T11:00:00Z"), latestTopic: "MARKETPLACE_ACCOUNT_DELETION" });
  vi.mocked(db.getEbayMarketSignals).mockResolvedValue([]);
  vi.mocked(getEbaySubscriptionState).mockResolvedValue({ state: "checked", topics: [], checkedAt: new Date(), message: "Listing access pending" });
});
describe("eBay monitoring API", () => {
  it("returns aggregate data without raw payloads, personal identifiers, or credentials", async () => {
    const result = await appRouter.createCaller(context()).monitoring.ebay();
    expect(result.summary.notifications).toBe(15);
    expect(result.market.observations).toBe(0);
    expect(result).not.toHaveProperty("recentListingEvents");
    expect(JSON.stringify(result)).not.toMatch(/rawPayload|signatureKid|eiasToken|verificationToken|clientSecret/);
  });
  it("requires sign-in for item-level history", async () => {
    await expect(appRouter.createCaller(context()).monitoring.listingSignals()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getEbayMarketSignals).not.toHaveBeenCalled();
  });
  it("allows signed-in users to query normalized history", async () => {
    expect(await appRouter.createCaller(context(true)).monitoring.listingSignals()).toEqual([]);
  });
  it("reports database failures instead of inventing successful zero counts", async () => {
    vi.mocked(db.getEbayNotificationSummary).mockRejectedValue(new Error("Database not available"));
    await expect(appRouter.createCaller(context()).monitoring.ebay()).rejects.toThrow("Database not available");
  });
});
