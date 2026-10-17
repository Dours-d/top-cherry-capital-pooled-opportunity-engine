import { describe, expect, it } from "vitest";

import { LISTINGS } from "../lib/market-data";
import { buildDemoThesis } from "../lib/demo-thesis";

describe("read-only demonstration thesis", () => {
  it("builds a traceable path from a listing to sample evidence", () => {
    const listing = LISTINGS[0];
    const result = buildDemoThesis(listing);
    expect(result.thesis.provenance.kind).toBe("demonstration");
    expect(result.evaluation.path).toHaveLength(1);
    expect(result.evaluation.supportingEvidence).toEqual([`obs-${listing.id}`]);
    expect(result.evaluation.status).toBe("monitoring");
    expect(result.evaluation.unknowns.length).toBeGreaterThan(0);
  });

  it("does not present the sample signal as a live forecast", () => {
    const result = buildDemoThesis(LISTINGS.find((listing) => listing.id === "leica-q3") ?? LISTINGS[0]);
    expect(result.observations[0].provenance.reference).toContain("Demonstration only");
    expect(result.thesis.claim).not.toContain("will");
    expect(result.thesis.claim).toContain("may");
  });
});
