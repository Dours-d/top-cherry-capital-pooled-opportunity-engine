import { describe, expect, it } from "vitest";
import { buildEbayReconciliationSnapshot, compareSnapshotToPrior } from "../shared/reconciliation-snapshots";

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
});
