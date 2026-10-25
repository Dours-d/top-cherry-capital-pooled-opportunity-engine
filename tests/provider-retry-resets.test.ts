import { describe, expect, it } from "vitest";
import {
  enqueueProviderRetryReset,
  markProviderRetryResetAttempt,
  parsePendingProviderRetryResets,
  removeProviderRetryReset,
  shouldSyncRetryResetQueueOnConnectivity,
} from "../shared/provider-retry-resets";

const entry = {
  resetId: "reset-1",
  providerListingId: "item-1",
  previousAttemptCount: 3,
  note: "Provider may be available again",
  occurredAt: "2026-10-25T10:00:00.000Z",
  attemptCount: 0,
};

describe("provider retry-reset queue", () => {
  it("rejects malformed persisted values without throwing", () => {
    expect(parsePendingProviderRetryResets("not-json")).toEqual([]);
    expect(parsePendingProviderRetryResets(JSON.stringify([{ resetId: "missing-fields" }]))).toEqual([]);
  });

  it("deduplicates by stable reset ID and caps queue size", () => {
    const replacement = { ...entry, note: "Updated note" };
    expect(enqueueProviderRetryReset([entry], replacement)).toEqual([replacement]);
    const many = Array.from({ length: 55 }, (_, index) => ({ ...entry, resetId: `reset-${index}` }));
    expect(enqueueProviderRetryReset([], entry).length).toBe(1);
    expect(many.length).toBe(55);
  });

  it("retains failure diagnostics until server confirmation", () => {
    const attempted = markProviderRetryResetAttempt([entry], entry.resetId, "2026-10-25T10:01:00.000Z", "network");
    expect(attempted[0]).toMatchObject({ attemptCount: 1, lastAttemptAt: "2026-10-25T10:01:00.000Z", lastError: "network" });
    expect(removeProviderRetryReset(attempted, entry.resetId)).toEqual([]);
  });

  it("only triggers a bounded sync on a real browser-online transition", () => {
    const base = { platform: "web" as const, online: true, previousOnline: false, authenticated: true, hydrated: true, pendingCount: 1 };
    expect(shouldSyncRetryResetQueueOnConnectivity(base)).toBe(true);
    expect(shouldSyncRetryResetQueueOnConnectivity({ ...base, previousOnline: true })).toBe(false);
    expect(shouldSyncRetryResetQueueOnConnectivity({ ...base, online: false })).toBe(false);
    expect(shouldSyncRetryResetQueueOnConnectivity({ ...base, platform: "native", online: null })).toBe(false);
    expect(shouldSyncRetryResetQueueOnConnectivity({ ...base, authenticated: false })).toBe(false);
    expect(shouldSyncRetryResetQueueOnConnectivity({ ...base, hydrated: false })).toBe(false);
    expect(shouldSyncRetryResetQueueOnConnectivity({ ...base, pendingCount: 0 })).toBe(false);
  });
});
