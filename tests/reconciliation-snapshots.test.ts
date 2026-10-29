import { describe, expect, it } from "vitest";
import { buildEbayReconciliationSnapshot, buildResearchListingFromSnapshot, classifyProviderReadError, compareCurrentProviderReadToSnapshot, compareSnapshotToPrior, evaluateEbayItemDetailCoverage, evaluateSnapshotReconciliation, getProviderReadRetryDelayMs, getSnapshotFreshness, nextSnapshotFreshnessThreshold, normalizeSnapshotFreshnessThreshold, PROVIDER_READ_MAX_RETRIES, summarizeSnapshotSourceQuality } from "../shared/reconciliation-snapshots";

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
  it("classifies provider-read failures without exposing raw error details", () => {
    expect(classifyProviderReadError(new Error("fetch failed: timeout"))).toBe("offline");
    expect(classifyProviderReadError(new Error("HTTP 403 forbidden"))).toBe("unauthorized");
    expect(classifyProviderReadError(new Error("item not found"))).toBe("not-found");
    expect(classifyProviderReadError(new Error("provider rejected request"))).toBe("provider");
    expect(classifyProviderReadError({ code: "secret" })).toBe("unknown");
  });

  it("caps provider retries and uses bounded exponential backoff", () => {
    expect(PROVIDER_READ_MAX_RETRIES).toBe(3);
    expect(getProviderReadRetryDelayMs(0)).toBe(0);
    expect(getProviderReadRetryDelayMs(1)).toBe(1000);
    expect(getProviderReadRetryDelayMs(2)).toBe(2000);
    expect(getProviderReadRetryDelayMs(3)).toBe(4000);
    expect(getProviderReadRetryDelayMs(99)).toBe(4000);
  });

  it("compares a current provider read only when currencies match", () => {
    expect(compareCurrentProviderReadToSnapshot({ providerPrice: 8750, providerCurrency: "GBP", persistedPrice: 8500, persistedCurrency: "GBP" })).toMatchObject({ state: "increased", delta: 250, currency: "GBP" });
    expect(compareCurrentProviderReadToSnapshot({ providerPrice: 8750, providerCurrency: "USD", persistedPrice: 8500, persistedCurrency: "GBP" })).toMatchObject({ state: "unknown", reason: "currency-mismatch" });
  });

  it("does not infer movement when either price or currency is absent", () => {
    expect(compareCurrentProviderReadToSnapshot({ providerPrice: 8750, providerCurrency: undefined, persistedPrice: 8500, persistedCurrency: "GBP" })).toMatchObject({ state: "unknown", reason: "missing-currency" });
    expect(compareCurrentProviderReadToSnapshot({ providerPrice: undefined, providerCurrency: "GBP", persistedPrice: 8500, persistedCurrency: "GBP" })).toMatchObject({ state: "unknown", reason: "missing-price" });
  });

  it("summarizes age distribution and missing provider fields without filling gaps", () => {
    const summary = summarizeSnapshotSourceQuality([
      { providerListingId: "one", title: "One", askingPrice: 100, condition: "Used", currency: "GBP", sourceFetchedAt: "2026-10-24T10:00:00.000Z" },
      { providerListingId: "two", title: "Two", askingPrice: 120, condition: "Used", sourceFetchedAt: "2026-10-20T10:00:00.000Z" },
    ], "2026-10-24T11:00:00.000Z");
    expect(summary.observationCount).toBe(2);
    expect(summary.ageCounts.fresh).toBe(1);
    expect(summary.ageCounts.aging).toBe(1);
    expect(summary.missingCounts.currency).toBe(1);
    expect(summary.missingCounts.sellerId).toBe(2);
  });

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

  it("maps a normalized observation into the primary research store without valuation fields", () => {
    const snapshot = buildEbayReconciliationSnapshot({ listing, marketplaceId: "EBAY_GB", query: "luxury watch", profileSlug: "luxury_watches", sourceFetchedAt: "2026-10-23T10:00:00.000Z" });
    const record = buildResearchListingFromSnapshot(snapshot);
    expect(record).toMatchObject({
      marketplaceId: "EBAY_GB",
      query: "luxury watch",
      providerListingId: "v1|123456",
      latestSnapshotId: snapshot.snapshotId,
      firstObservedAt: snapshot.sourceFetchedAt,
      lastObservedAt: snapshot.sourceFetchedAt,
      observationCount: 1,
    });
    expect(record).not.toHaveProperty("marketValue");
    expect(record).not.toHaveProperty("score");
    expect(record).not.toHaveProperty("allocation");
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
    expect(evaluateEbayItemDetailCoverage({ itemId: "v1|123456", title: "Watch", askingPrice: 8500, condition: "Used", fetchedAt: "2026-10-23T10:00:00.000Z", profileSlug: "luxury_watches", localizedAspects: [{ name: "Brand", value: "Rolex" }] })).toMatchObject({ state: "present", aspectCount: 1, requiredMissing: [], recommendedMissing: ["Model", "Reference Number", "Condition"] });
  });
});
