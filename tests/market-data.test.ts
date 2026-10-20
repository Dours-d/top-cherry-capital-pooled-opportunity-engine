import { describe, expect, it } from "vitest";
import { DEFAULT_ECONOMICS, LISTINGS, PROFILES, formatCurrency, getAskingPriceDecisionGate, getListingEconomics, getListingSignals, getProfile, getProfileListings, mapLiveEbayListings, recommendAllocations } from "../lib/market-data";

describe("Top Cherry market data", () => {
  it("ships a broad marketplace-independent default category registry", () => {
    expect(PROFILES.map((profile) => profile.slug)).toEqual([
      "luxury_watches",
      "camera_gear",
      "collectibles",
      "premium_audio",
      "performance_cars",
      "musical_instruments",
      "fine_jewellery",
      "sports_collectibles",
      "home_and_living",
    ]);
    expect(PROFILES.every((profile) => profile.icon)).toBe(true);
  });

  it("falls back to watches for an unknown profile", () => {
    expect(getProfile("does_not_exist").slug).toBe("luxury_watches");
  });

  it("scopes listings to the active profile", () => {
    const watches = getProfileListings("luxury_watches");
    expect(watches.length).toBeGreaterThan(0);
    expect(watches.every((listing) => listing.profileSlug === "luxury_watches")).toBe(true);
    expect(watches).toHaveLength(LISTINGS.filter((listing) => listing.profileSlug === "luxury_watches").length);
  });

  it("keeps cherry scores and margins in the expected display ranges", () => {
    expect(LISTINGS.every((listing) => listing.score >= 0 && listing.score <= 100)).toBe(true);
    expect(LISTINGS.every((listing) => listing.margin > -100 && listing.margin < 100)).toBe(true);
  });

  it("formats deal prices as whole-dollar USD", () => {
    expect(formatCurrency(13800)).toBe("$13,800");
  });

  it("maps live eBay asking prices without inventing valuation signals", () => {
    const [listing] = mapLiveEbayListings([{
      listingId: "v1|123|0",
      profileSlug: "luxury_watches",
      brand: "Tudor",
      model: "Tudor Black Bay",
      askingPrice: 3066.7,
      condition: "Used",
      location: "GB",
      countryCode: "GB",
      currency: "GBP",
      url: "https://www.ebay.co.uk/itm/123",
    }]);

    expect(listing).toMatchObject({ id: "ebay:v1|123|0", askingPrice: 3066.7, currency: "GBP", sourceMode: "live-asking-price", marketValue: 0, score: 0, margin: 0 });
    expect(formatCurrency(listing.askingPrice, listing.currency)).toBe("£3,067");
  });

  it("keeps a live asking price observation-only until separate evidence exists", () => {
    const [listing] = mapLiveEbayListings([{
      listingId: "v1|124|0",
      profileSlug: "luxury_watches",
      brand: "Tudor",
      model: "Tudor Black Bay",
      askingPrice: 3066.7,
      condition: "Used",
      countryCode: "GB",
    }]);
    const gate = getAskingPriceDecisionGate(listing);
    expect(gate).toMatchObject({ state: "observe-only", canAllocate: false });
    expect(gate.missingEvidence).toContain("independent benchmark or valuation thesis");
    expect(gate.leverage).toContain("affordability");
  });

  it("changes the recommended mix when the available capital changes", () => {
    const modest = recommendAllocations(3000);
    const powerful = recommendAllocations(25000);

    expect(Object.keys(modest)).not.toEqual(Object.keys(powerful));
    expect(Object.keys(modest).length).toBeGreaterThan(0);
    expect(Object.keys(modest).every((id) => LISTINGS.find((listing) => listing.id === id)!.askingPrice <= 3000)).toBe(true);
    expect(powerful["pokemon-charizard"] ?? 0).toBeGreaterThan(0);
  });

  it("deducts transaction and pickup costs from net upside", () => {
    const economics = getListingEconomics(LISTINGS.find((listing) => listing.id === "design-lamp")!);
    expect(economics.grossUpside).toBe(450);
    expect(economics.travelCost).toBeGreaterThan(0);
    expect(economics.netUpside).toBeLessThan(economics.grossUpside);
  });

  it("changes net upside when the user changes travel assumptions", () => {
    const listing = LISTINGS.find((item) => item.id === "design-lamp")!;
    const economical = getListingEconomics(listing, { ...DEFAULT_ECONOMICS, travelCostPerKm: 0 });
    const expensive = getListingEconomics(listing, { ...DEFAULT_ECONOMICS, travelCostPerKm: 2 });
    expect(expensive.netUpside).toBeLessThan(economical.netUpside);
  });

  it("exposes three-layer signals with bounded novelty and propagation scores", () => {
    const signals = getListingSignals(LISTINGS.find((listing) => listing.id === "leica-q3")!);
    expect(signals.noveltyScore).toBeGreaterThanOrEqual(0);
    expect(signals.noveltyScore).toBeLessThanOrEqual(100);
    expect(signals.propagationScore).toBeGreaterThanOrEqual(0);
    expect(signals.propagationScore).toBeLessThanOrEqual(100);
    expect(signals.networkMomentum).toBe("Rising");
    expect(signals.actionWindow).toBe("Act now");
    expect(signals.distortionRisk).toBe("Low");
  });

  it("keeps distortion risk visible when seller concentration is high", () => {
    const signals = getListingSignals(LISTINGS.find((listing) => listing.id === "vitra-eames-chair")!);
    expect(signals.sellerConcentration).toBe("High");
    expect(signals.distortionRisk).toBe("Medium");
    expect(signals.actionWindow).toBe("Monitor");
  });
});
