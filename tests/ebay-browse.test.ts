import { describe, expect, it } from "vitest";
import { getAllInAcquisitionCost, recommendAllocations, type EconomicsAssumptions, type Listing } from "../lib/market-data";
import { normalizeEbayItemSummary } from "../server/marketplace";

describe("eBay Browse adapter", () => {
  it("normalizes a live item summary without inventing market value", () => {
    const listing = normalizeEbayItemSummary({
      itemId: "v1|123|0",
      title: "Leica Q3 Digital Camera",
      price: { value: "3066.70", currency: "GBP" },
      condition: "Used",
      itemWebUrl: "https://www.ebay.co.uk/itm/123",
      itemLocation: { country: "GB" },
    }, "EBAY_GB");

    expect(listing.listingId).toBe("v1|123|0");
    expect(listing.askingPrice).toBe(3066.7);
    expect(listing.currency).toBe("GBP");
    expect(listing.marketValue).toBe(0);
    expect(listing.verified).toBe(false);
    expect(listing.url).toContain("ebay.co.uk");
  });
});

describe("reserve-aware capital planning", () => {
  it("uses all-in acquisition cost rather than asking price alone", () => {
    const assumptions: EconomicsAssumptions = { homeCountry: "GB", transactionFeeRate: 0.1, shippingRate: 0, travelCostPerKm: 0 };
    const listing = { askingPrice: 100, marketValue: 220, shippingCost: 25, transactionFee: 10, travelCost: 50 } as Listing;
    expect(getAllInAcquisitionCost(listing, assumptions)).toBe(185);
  });

  it("does not allocate the protected reserve", () => {
    const allocations = recommendAllocations(200, [{
      id: "cheap", profileSlug: "test", brand: "Test", model: "Item", askingPrice: 100, marketValue: 180, score: 90, margin: 44, condition: "Used", platform: "Test", location: "GB", escrowProtected: false, verified: false, age: "now", url: "https://example.test/cheap", shippingCost: 0, travelCost: 0,
    }], { homeCountry: "GB", transactionFeeRate: 0, shippingRate: 0, travelCostPerKm: 0 }, 50);
    expect(allocations.cheap ?? 0).toBe(1);
  });
});
