import { describe, expect, it } from "vitest";
import { LISTINGS } from "../lib/market-data";
import { MARKETPLACE_SOURCES, previewNormalizedImport, scoreNormalizedListing } from "../server/marketplace";

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
});
