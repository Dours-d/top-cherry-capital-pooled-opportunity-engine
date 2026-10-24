import { describe, expect, it } from "vitest";
import {
  enqueueCharacteristicCheck,
  normalizeCharacteristicCheckQueue,
  resolveCharacteristicCheck,
  type PendingCharacteristicCheck,
} from "../shared/characteristic-check-audits";

const item: PendingCharacteristicCheck = {
  auditId: "characteristics:s1:1",
  snapshotId: "s1",
  note: "Reviewed seller-provided aspects",
};

describe("characteristic check audit queue", () => {
  it("deduplicates by audit id and preserves bounded local records", () => {
    expect(enqueueCharacteristicCheck([item], item)).toEqual([item]);
  });

  it("keeps a failed write with diagnostics", () => {
    expect(resolveCharacteristicCheck([item], item.auditId, { ok: false, error: "offline" }, "2026-10-24T07:00:00.000Z")).toEqual([{ ...item, syncError: "offline", lastAttemptAt: "2026-10-24T07:00:00.000Z" }]);
  });

  it("removes only after server confirmation", () => {
    expect(resolveCharacteristicCheck([item], item.auditId, { ok: true }, "2026-10-24T07:00:00.000Z")).toEqual([]);
  });

  it("ignores malformed persisted entries", () => {
    expect(normalizeCharacteristicCheckQueue([item, { auditId: "bad" }, null, { ...item, note: "" }])).toEqual([item]);
  });
});
