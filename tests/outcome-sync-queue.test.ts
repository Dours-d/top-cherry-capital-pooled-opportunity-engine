import { describe, expect, it } from "vitest";
import { dismissalsFromOutcomeSyncAudits, dismissPendingOutcome, mergeOutcomeSyncAudits, restoreDismissedOutcome, type OutcomeSyncDismissal, type PendingOutcomeRecord } from "../shared/outcome-sync-queue";

const outcome: PendingOutcomeRecord = {
  id: "outcome-1",
  listingId: "listing-1",
  kind: "price-revised",
  observedAt: "2026-10-22T10:00:00.000Z",
  realizedPrice: 120,
  currency: "GBP",
};

describe("outcome sync queue transitions", () => {
  it("requires a note and removes only the selected pending record", () => {
    expect(dismissPendingOutcome([outcome], [], outcome.id, "  ", "2026-10-22T10:01:00.000Z")).toBeNull();
    const result = dismissPendingOutcome([outcome], [], outcome.id, "Reviewed; provider unavailable", "2026-10-22T10:01:00.000Z");
    expect(result?.pending).toEqual([]);
    expect(result?.dismissals[0]).toEqual({ outcomeId: "outcome-1", clearedAt: "2026-10-22T10:01:00.000Z", note: "Reviewed; provider unavailable" });
  });

  it("restores a dismissed record with a separate audit note and retry-required state", () => {
    const dismissal: OutcomeSyncDismissal = { outcomeId: outcome.id, clearedAt: "2026-10-22T10:01:00.000Z", note: "Reviewed; provider unavailable" };
    expect(restoreDismissedOutcome([], [dismissal], [outcome], outcome.id, "  ", "2026-10-22T10:02:00.000Z")).toBeNull();
    const result = restoreDismissedOutcome([], [dismissal], [outcome], outcome.id, "Retry after provider recovery", "2026-10-22T10:02:00.000Z");
    expect(result?.pending[0]).toMatchObject({ id: "outcome-1", syncError: "Restored after an intentional dismissal; retry required." });
    expect(result?.dismissals[0]).toMatchObject({ outcomeId: "outcome-1", restoredAt: "2026-10-22T10:02:00.000Z", restoreNote: "Retry after provider recovery" });
  });

  it("does not restore twice or create a duplicate pending record", () => {
    const dismissal: OutcomeSyncDismissal = { outcomeId: outcome.id, clearedAt: "2026-10-22T10:01:00.000Z", note: "Reviewed" };
    expect(restoreDismissedOutcome([outcome], [dismissal], [outcome], outcome.id, "Retry", "2026-10-22T10:02:00.000Z")).toBeNull();
    expect(restoreDismissedOutcome([], [{ ...dismissal, restoredAt: "2026-10-22T10:02:00.000Z" }], [outcome], outcome.id, "Retry again", "2026-10-22T10:03:00.000Z")).toBeNull();
  });

  it("merges audit events idempotently and reconstructs restored dismissal context", () => {
    const dismissed = { auditId: "dismissed:outcome-1:1", outcomeId: "outcome-1", action: "dismissed" as const, occurredAt: "2026-10-22T10:01:00.000Z", note: "Provider unavailable" };
    const restored = { auditId: "restored:outcome-1:2", outcomeId: "outcome-1", action: "restored" as const, occurredAt: "2026-10-22T10:02:00.000Z", note: "Retry after recovery" };
    const merged = mergeOutcomeSyncAudits([dismissed], [dismissed, restored]);
    expect(merged).toHaveLength(2);
    expect(dismissalsFromOutcomeSyncAudits(merged)).toEqual([{ outcomeId: "outcome-1", clearedAt: dismissed.occurredAt, note: dismissed.note, restoredAt: restored.occurredAt, restoreNote: restored.note }]);
  });
});
