import { describe, expect, it } from "vitest";
import { LISTINGS, PROFILES, formatCurrency, getProfile, getProfileListings } from "../lib/market-data";

describe("Top Cherry market data", () => {
  it("ships the three default market profiles", () => {
    expect(PROFILES.map((profile) => profile.slug)).toEqual([
      "luxury_watches",
      "camera_gear",
      "collectibles",
    ]);
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
});
