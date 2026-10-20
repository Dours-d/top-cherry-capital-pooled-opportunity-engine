import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllInAcquisitionCost, recommendAllocations, type EconomicsAssumptions, type Listing } from "../lib/market-data";
import { getEbayBrowseItem, normalizeEbayItemSummary, searchEbayBrowse } from "../server/marketplace";

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

  it("passes Browse offset and reports whether another page exists", async () => {
    const previousAppId = process.env.EBAY_APP_ID;
    const previousSecret = process.env.EBAY_CLIENT_SECRET;
    process.env.EBAY_APP_ID = "test-app";
    process.env.EBAY_CLIENT_SECRET = "test-secret";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 45, itemSummaries: [{ itemId: "item-21", title: "Watch", price: { value: "100", currency: "GBP" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchEbayBrowse({ query: "watch", marketplaceId: "EBAY_GB", limit: 20, offset: 20 });

    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("offset=20");
    expect(result).toMatchObject({ offset: 20, total: 45, hasMore: true });
    vi.unstubAllGlobals();
    if (previousAppId === undefined) delete process.env.EBAY_APP_ID; else process.env.EBAY_APP_ID = previousAppId;
    if (previousSecret === undefined) delete process.env.EBAY_CLIENT_SECRET; else process.env.EBAY_CLIENT_SECRET = previousSecret;
  });

  it("normalizes seller-provided item characteristics from getItem", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ itemId: "v1|123|0", title: "Watch", condition: "Used", price: { value: "100", currency: "GBP" }, localizedAspects: [{ name: "Brand", value: "Example" }, { name: "Model", value: "A1" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getEbayBrowseItem({ itemId: "v1|123|0", marketplaceId: "EBAY_GB" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("v1%7C123%7C0");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("fieldgroups=PRODUCT");
    expect(result.localizedAspects).toEqual([{ name: "Brand", value: "Example" }, { name: "Model", value: "A1" }]);
    vi.unstubAllGlobals();
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
