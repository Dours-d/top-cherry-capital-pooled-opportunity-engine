import { describe, expect, it } from "vitest";
import { buildEbayReconciliationSnapshot, compareSnapshotToPrior, evaluateEbayItemDetailCoverage, evaluateSnapshotReconciliation, getSnapshotFreshness, nextSnapshotFreshnessThreshold, normalizeSnapshotFreshnessThreshold } from "../shared/reconciliation-snapshots";

const listing = {
  listingId: "v1|123456",
  profileSlug: "luxury_watches",
  brand: "Rolex",
  model: "Rolex Submariner 124060",
  askingPrice: 8500,
  condition: "Used",
  location: "GB",
  countryCode: "GB",
  currency: "GBP",
  url: "https://www.ebay.co.uk/itm/123456",
  sellerId: "seller-7",
};

describe("reconciliation snapshots", () => {
  it("preserves provider identity, source context, and asking price without valuation fields", () => {
    const snapshot = buildEbayReconciliationSnapshot({ listing, marketplaceId: "EBAY_GB", query: "luxury watch", profileSlug: "luxury_watches", sourceFetchedAt: "2026-10-23T10:00:00.000Z" });
    expect(snapshot).toMatchObject({
      snapshotId: "ebay:EBAY_GB:2026-10-23T10:00:00.000Z:v1|123456",
      sourceSlug: "ebay",
      marketplaceId: "EBAY_GB",
      providerListingId: "v1|123456",
      title: "Rolex Submariner 124060",
      askingPrice: 8500,
      currency: "GBP",
      sellerId: "seller-7",
      sourceUrl: "https://www.ebay.co.uk/itm/123456",
      reconciliationStatus: "observed",
    });
    expect(snapshot).not.toHaveProperty("marketValue");
    expect(snapshot).not.toHaveProperty("score");
    expect(snapshot).not.toHaveProperty("marginPercentage");
  });

  it("keeps absent seller and URL unknown rather than inventing provenance", () => {
    const snapshot = buildEbayReconciliationSnapshot({ listing: { ...listing, sellerId: undefined, url: undefined }, marketplaceId: "EBAY_GB", query: "luxury watch", profileSlug: "luxury_watches", sourceFetchedAt: "2026-10-23T10:00:00.000Z" });
    expect(snapshot).not.toHaveProperty("sellerId");
    expect(snapshot).not.toHaveProperty("sourceUrl");
  });

  it("reports only currency-matched movement from an earlier provider observation", () => {
    const current = { providerListingId: "v1|123456", askingPrice: 8800, currency: "GBP", sourceFetchedAt: "2026-10-23T10:00:00.000Z" };
    const prior = { providerListingId: "v1|123456", askingPrice: 8500, currency: "GBP", sourceFetchedAt: "2026-10-22T10:00:00.000Z" };
    expect(compareSnapshotToPrior(current, [prior])).toMatchObject({ state: "increased", priorPrice: 8500, delta: 300, comparableObservationCount: 1 });
  });

  it("keeps movement unknown when currency is absent or mismatched", () => {
    const current = { providerListingId: "v1|123456", askingPrice: 8800, currency: "GBP", sourceFetchedAt: "2026-10-23T10:00:00.000Z" };
    const prior = { providerListingId: "v1|123456", askingPrice: 8500, currency: "EUR", sourceFetchedAt: "2026-10-22T10:00:00.000Z" };
    expect(compareSnapshotToPrior(current, [prior])).toMatchObject({ state: "unknown", comparableObservationCount: 0 });
    expect(compareSnapshotToPrior({ ...current, currency: undefined as string | undefined }, [prior]).state).toBe("unknown");
  });

  it("classifies observation age as a data-quality prompt only", () => {
    const now = "2026-10-23T12:00:00.000Z";
    expect(getSnapshotFreshness("2026-10-23T11:00:00.000Z", now).state).toBe("fresh");
    expect(getSnapshotFreshness("2026-10-22T00:00:00.000Z", now).state).toBe("aging");
    expect(getSnapshotFreshness("2026-10-01T00:00:00.000Z", now).state).toBe("stale");
    expect(getSnapshotFreshness("not-a-date", now).state).toBe("unknown");
  });

  it("supports bounded marketplace-specific freshness thresholds", () => {
    expect(normalizeSnapshotFreshnessThreshold({ freshHours: 6, agingHours: 48 })).toEqual({ freshHours: 6, agingHours: 48 });
    expect(normalizeSnapshotFreshnessThreshold({ freshHours: 200, agingHours: 10 })).toEqual({ freshHours: 200, agingHours: 201 });
    expect(getSnapshotFreshness("2026-10-22T12:00:00.000Z", "2026-10-23T12:00:00.000Z", { freshHours: 12, agingHours: 72 }).state).toBe("aging");
    expect(getSnapshotFreshness("2026-10-20T11:00:00.000Z", "2026-10-23T12:00:00.000Z", { freshHours: 12, agingHours: 72 }).state).toBe("stale");
    expect(nextSnapshotFreshnessThreshold({ freshHours: 24, agingHours: 168 })).toEqual({ freshHours: 48, agingHours: 336 });
  });

  it("applies provider-specific reconciliation rules without inferring value or stock", () => {
    expect(evaluateSnapshotReconciliation({ marketplaceId: "EBAY_GB", providerListingId: "v1|123456", title: "Watch", askingPrice: 8500, condition: "Used", sourceFetchedAt: "2026-10-23T10:00:00.000Z" })).toEqual({ state: "ready", requiredMissing: [], recommendedMissing: ["currency", "location", "sellerId", "sourceUrl"] });
    expect(evaluateSnapshotReconciliation({ marketplaceId: "EBAY_GB", title: "Watch", askingPrice: 8500, condition: "Used", sourceFetchedAt: "2026-10-23T10:00:00.000Z" })).toMatchObject({ state: "needs-attention", requiredMissing: ["providerListingId"] });
    expect(evaluateSnapshotReconciliation({ marketplaceId: "OTHER", providerListingId: "item-1", title: "Item", askingPrice: 10, sourceFetchedAt: "2026-10-23T10:00:00.000Z" }).state).toBe("ready");
  });

  it("treats eBay item characteristics as seller-supplied coverage, not completeness", () => {
    expect(evaluateEbayItemDetailCoverage().state).toBe("unavailable");
    expect(evaluateEbayItemDetailCoverage({ itemId: "v1|123456", title: "Watch", askingPrice: 8500, condition: "Used", fetchedAt: "2026-10-23T10:00:00.000Z", localizedAspects: [] })).toMatchObject({ state: "partial", aspectCount: 0 });
    expect(evaluateEbayItemDetailCoverage({ itemId: "v1|123456", title: "Watch", askingPrice: 8500, condition: "Used", fetchedAt: "2026-10-23T10:00:00.000Z", localizedAspects: [{ name: "Brand", value: "Rolex" }] })).toMatchObject({ state: "present", aspectCount: 1, requiredMissing: [] });
  });
});
