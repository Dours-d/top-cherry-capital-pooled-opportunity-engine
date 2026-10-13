import { describe, expect, it } from "vitest";
import { LISTINGS } from "../lib/market-data";
import { MARKETPLACE_SOURCES, PHASE_ONE_EBAY_TASKS, getMarketplaceReadiness, previewNormalizedImport, scoreNormalizedListing } from "../server/marketplace";

describe("pooled capital planning", () => {
  it("calculates deployed capital and projected upside from quantities", () => {
    const listing = LISTINGS[0];
    const quantity = 2;
    const deployed = quantity * listing.askingPrice;
    const projectedUpside = quantity * (listing.marketValue - listing.askingPrice);
    const budget = 30000;

    expect(deployed).toBe(27600);
    expect(projectedUpside).toBe(11400);
    expect((deployed / budget) * 100).toBeCloseTo(92, 5);
  });

  it("sizes a normalized import with a deterministic Cherry Score", () => {
    const scored = scoreNormalizedListing({
      listingId: "sample-1",
      profileSlug: "camera_gear",
      brand: "Leica",
      model: "Q3",
      askingPrice: 4000,
      marketValue: 5000,
      condition: "Like new",
      platformSource: "MPB",
      escrowProtected: true,
      verified: true,
    });

    expect(scored.marginPercentage).toBe(20);
    expect(scored.cherryScore).toBe(92);
  });

  it("validates the provider adapter registry before previewing an import", () => {
    const result = previewNormalizedImport("ebay", []);
    expect(result.source.status).toBe("credentials-required");
    expect(result.importedCount).toBe(0);
  });

  it("registers regional general marketplaces independently from specialist sources", () => {
    const regional = MARKETPLACE_SOURCES.filter((source) => source.coverage === "regional-general");
    expect(regional.map((source) => source.slug)).toEqual(["wallapop", "leboncoin", "kleinanzeigen", "marktplaats"]);
    expect(regional.every((source) => source.capabilities.includes("local-pickup"))).toBe(true);
  });

  it("reports live-ingestion readiness without exposing credential values", () => {
    const readiness = getMarketplaceReadiness("wallapop", { NODE_ENV: "test" });
    expect(readiness.configured).toBe(false);
    expect(readiness.nextStep).toBe("configure WALLAPOP_API_TOKEN");
    expect(readiness).not.toHaveProperty("token");
  });

  it("deduplicates normalized imports by canonical listing URL", () => {
    const listing = {
      listingId: "a",
      profileSlug: "luxury_watches",
      brand: "Omega",
      model: "Speedmaster",
      askingPrice: 1000,
      marketValue: 1400,
      condition: "Good",
      platformSource: "eBay",
      escrowProtected: true,
      verified: true,
      url: "https://example.test/item/1/",
    };
    const result = previewNormalizedImport("ebay", [listing, { ...listing, listingId: "b", url: "https://example.test/item/1" }]);
    expect(result.importedCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
  });

  it("keeps Phase 1 eBay rollout explicitly blocked until production access is approved", () => {
    expect(PHASE_ONE_EBAY_TASKS.find((task) => task.id === "buy-api-access")?.state).toBe("blocked");
    expect(PHASE_ONE_EBAY_TASKS.filter((task) => task.state === "done")).toHaveLength(2);
    expect(PHASE_ONE_EBAY_TASKS.find((task) => task.id === "first-sync")?.state).toBe("next");
  });

  it("requires both configured eBay application credentials without claiming live authorization", () => {
    expect(getMarketplaceReadiness("ebay", { NODE_ENV: "test", EBAY_APP_ID: "present" }).configured).toBe(false);
    const ready = getMarketplaceReadiness("ebay", { NODE_ENV: "test", EBAY_APP_ID: "present", EBAY_CLIENT_SECRET: "secret" });
    expect(ready.configured).toBe(true);
    expect(ready.nextStep).toBe("verify-provider-access");
    expect(JSON.stringify(ready)).not.toContain('"secret"');
  });
});
