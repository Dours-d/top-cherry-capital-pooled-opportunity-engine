import { describe, expect, it } from "vitest";
import { LISTINGS, getListingRedundancySummary, summarizeListingOutcomes } from "../lib/market-data";
import { buildDemoThesis } from "../lib/demo-thesis";
import { evaluateThesis } from "../shared/evaluate-thesis";
import { canAllocateCandidate, reconcileThesisDrafts } from "../shared/reconcile-drafts";
import { createThesisDraft, reviseThesisDraft } from "../shared/versioned-drafts";
import { mergeObservationReviews, normalizeObservationReview } from "../shared/observation-reviews";
import { mergeListingOutcomes } from "../shared/listing-outcomes";

const listing = LISTINGS[0];

describe("thesis acceptance flow", () => {
  it("merges disjoint server and device revisions without rewriting lineage", () => {
    const thesis = buildDemoThesis(listing).thesis;
    const first = createThesisDraft({ draftId: "acceptance-1", thesis, createdAt: "2026-10-01T00:00:00.000Z", createdBy: "operator" });
    const second = reviseThesisDraft(first, { thesis: { ...thesis, claim: "Updated claim" }, createdAt: "2026-10-02T00:00:00.000Z", createdBy: "operator", changeSummary: "Clarify claim" });
    const result = reconcileThesisDrafts([first], [first, second]);
    expect(result.status).toBe("merged");
    if (result.status === "merged") expect(result.store.current.revision).toBe(2);
  });

  it("keeps a same-revision divergent edit as an explicit conflict", () => {
    const thesis = buildDemoThesis(listing).thesis;
    const first = createThesisDraft({ draftId: "acceptance-2", thesis, createdAt: "2026-10-01T00:00:00.000Z", createdBy: "operator" });
    const local = { ...first, thesis: { ...thesis, claim: "Local claim" } };
    const remote = { ...first, thesis: { ...thesis, claim: "Remote claim" } };
    expect(reconcileThesisDrafts([local], [remote]).status).toBe("conflict");
  });

  it("only allocates after thesis readiness, candidate feasibility, and budget checks all pass", () => {
    const demo = buildDemoThesis(listing);
    const evaluation = evaluateThesis({ nodes: demo.nodes, edges: demo.edges, exposures: [], observations: demo.observations, thesis: demo.thesis });
    expect(canAllocateCandidate({ thesisStatus: evaluation.status, candidateVerified: listing.verified, escrowProtected: listing.escrowProtected, netUpside: 1000, budget: 20000, askingPrice: listing.askingPrice, reserve: 1000 })).toBe(false);
    expect(canAllocateCandidate({ thesisStatus: "ready", candidateVerified: true, escrowProtected: true, netUpside: 1000, budget: 20000, askingPrice: 13800, reserve: 1000 })).toBe(true);
  });

  it("keeps the end-to-end evidence path explicit from rows to outcomes to allocation", () => {
    const duplicate = { ...listing, id: "acceptance-duplicate", askingPrice: listing.askingPrice - 200, sellerId: "same-seller" };
    const observed = { ...listing, sellerId: "same-seller" };
    const identity = getListingRedundancySummary([observed, duplicate]);
    expect(identity.rawListingCount).toBe(2);
    expect(identity.candidateItemCount).toBe(1);
    const outcome = summarizeListingOutcomes(listing, [{ id: "acceptance-sale", listingId: listing.id, kind: "sale-observed", observedAt: "2026-10-20T00:00:00.000Z", realizedPrice: listing.askingPrice - 300 }]);
    expect(outcome.evidenceQuality).toBe("strong");
    expect(outcome.priceDeltaFromAsk).toBeLessThan(0);
    expect(canAllocateCandidate({ thesisStatus: "ready", candidateVerified: true, escrowProtected: true, netUpside: 1000, budget: 20000, askingPrice: listing.askingPrice, reserve: 1000 })).toBe(true);
  });

  it("reconciles local and remote review acknowledgments idempotently without creating market evidence", () => {
    const local = normalizeObservationReview({ listingId: listing.id, reviewedAt: "2026-10-20T12:00:00.000Z", note: "Checked manually" });
    const remote = { ...local, note: "Server copy" };
    const merged = mergeObservationReviews([local], [remote, local]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ listingId: listing.id, reviewedAt: local.reviewedAt });
    expect(merged[0]).not.toHaveProperty("marketValue");
    expect(merged[0]).not.toHaveProperty("score");
    expect(merged[0]).not.toHaveProperty("marginPercentage");
  });

  it("reconciles outcome observations idempotently without creating a valuation record", () => {
    const local = { id: "outcome-1", listingId: listing.id, kind: "sale-observed" as const, observedAt: "2026-10-20T12:00:00.000Z", realizedPrice: 12000, currency: "GBP", note: "Observed evidence" };
    const merged = mergeListingOutcomes([local], [{ ...local }, local]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ listingId: listing.id, realizedPrice: 12000 });
    expect(merged[0]).not.toHaveProperty("marketValue");
    expect(merged[0]).not.toHaveProperty("score");
    expect(merged[0]).not.toHaveProperty("marginPercentage");
  });
});
