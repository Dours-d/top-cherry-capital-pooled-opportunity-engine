import { describe, expect, it } from "vitest";

import {
  assertDraftLineage,
  createDecisionDraft,
  createThesisDraft,
  reviseDecisionDraft,
  reviseThesisDraft,
  transitionDraftStatus,
} from "../shared/versioned-drafts";
import type { CapitalDecision, Thesis } from "../shared/transmission";

const thesis: Thesis = {
  id: "thesis-repair-audio",
  version: 1,
  title: "Repair access supports used-audio reservation value",
  status: "monitoring",
  nodeIds: ["driver-repair", "market-used-audio"],
  edgeIds: ["edge-repair-value"],
  exposureIds: [],
  observationIds: ["obs-repair"],
  asOf: "2026-09-10T00:00:00.000Z",
  claim: "Where repair access is durable, some owners may value repairable units more.",
  unknowns: ["Observed resale response is unknown"],
  invalidationConditions: ["Repair parts become unavailable"],
  provenance: { kind: "demonstration", sourceName: "R1 fixture", sourceUrl: null, retrievedAt: null, reference: null },
};

const decision: CapitalDecision = {
  id: "decision-repair-audio",
  thesisId: thesis.id,
  candidateId: "candidate-audio-1",
  quantity: 2,
  reserve: { minorUnits: 5000, currency: "EUR", scale: 2 },
  committed: { minorUnits: 20000, currency: "EUR", scale: 2 },
  decisionTime: "2026-09-10T00:00:00.000Z",
  assumptions: ["Two units remain available"],
};

const timestamps = {
  first: "2026-09-10T00:00:00.000Z",
  second: "2026-09-11T00:00:00.000Z",
};

describe("versioned research drafts", () => {
  it("creates and revises a thesis without mutating the prior revision", () => {
    const first = createThesisDraft({ draftId: "draft-1", thesis, createdAt: timestamps.first, createdBy: "operator" });
    const next = reviseThesisDraft(first, {
      thesis: { ...thesis, title: "Repair access and used-audio value" },
      createdAt: timestamps.second,
      createdBy: "operator",
      changeSummary: "Clarify the claim without adding evidence",
    });

    expect(first.revision).toBe(1);
    expect(first.thesis.title).toContain("reservation value");
    expect(next.revision).toBe(2);
    expect(next.basedOnRevision).toBe(1);
    expect(next.thesis.title).toBe("Repair access and used-audio value");
    expect(() => assertDraftLineage([first, next])).not.toThrow();
  });

  it("keeps decisions separate from theses and carries alternatives forward", () => {
    const first = createDecisionDraft({
      draftId: "decision-draft-1",
      decision,
      rationale: "Test a small quantity while evidence is incomplete.",
      alternatives: ["Wait for more observations"],
      constraints: ["Keep reserve intact"],
      createdAt: timestamps.first,
      createdBy: "operator",
    });
    const next = reviseDecisionDraft(first, {
      decision: { ...decision, quantity: 1 },
      rationale: "Reduce concentration while the evidence remains partial.",
      createdAt: timestamps.second,
      createdBy: "operator",
      changeSummary: "Reduce quantity after affordability review",
    });

    expect(next.kind).toBe("decision");
    expect(next.decision.quantity).toBe(1);
    expect(next.alternatives).toEqual(["Wait for more observations"]);
    expect(() => assertDraftLineage([first, next])).not.toThrow();
  });

  it("requires explicit status transitions and prevents editing submitted drafts", () => {
    const draft = createThesisDraft({ draftId: "draft-2", thesis, createdAt: timestamps.first, createdBy: "operator" });
    const submitted = transitionDraftStatus(draft, "submitted");
    expect(submitted.status).toBe("submitted");
    expect(() => reviseThesisDraft(submitted as typeof draft, {
      thesis,
      createdAt: timestamps.second,
      createdBy: "operator",
      changeSummary: "Should be rejected",
    })).toThrow("Only draft revisions can be edited");
    expect(() => transitionDraftStatus(submitted, "draft")).toThrow("Invalid draft transition");
  });

  it("rejects broken revision chains", () => {
    const first = createThesisDraft({ draftId: "draft-3", thesis, createdAt: timestamps.first, createdBy: "operator" });
    const next = reviseThesisDraft(first, { thesis, createdAt: timestamps.second, createdBy: "operator", changeSummary: "Second revision" });
    expect(() => assertDraftLineage([first, { ...next, basedOnRevision: 3 }])).toThrow("contiguous parent chain");
  });
});
