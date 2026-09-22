import { describe, expect, it } from "vitest";
import { LISTINGS, PROFILES, formatCurrency, getProfile, getProfileListings, recommendAllocations } from "../lib/market-data";

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

  it("changes the recommended mix when the available capital changes", () => {
    const modest = recommendAllocations(3000);
    const powerful = recommendAllocations(25000);

    expect(Object.keys(modest)).not.toEqual(Object.keys(powerful));
    expect(modest["focal-utopia"]).toBeGreaterThan(0);
    expect(powerful["pokemon-charizard"] ?? 0).toBeGreaterThan(0);
  });
});
