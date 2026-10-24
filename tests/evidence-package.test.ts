import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "../shared/evidence-package";

const sourceQuality = { observationCount: 1, ageCounts: { fresh: 1, aging: 0, stale: 0, unknown: 0 }, missingCounts: {} };

const snapshot = {
  snapshotId: "snapshot-1",
  marketplaceId: "EBAY_GB",
  providerListingId: "v1|123",
  profileSlug: "luxury_watches",
  title: "Example watch",
  askingPrice: 1000,
  currency: "GBP",
  condition: "Used",
  location: "GB",
  sellerId: "seller-1",
  sourceFetchedAt: "2026-10-24T10:00:00.000Z",
  reconciliationStatus: "observed" as const,
  reviewNote: null,
  reviewedAt: null,
  characteristicsChecked: false,
  characteristicsCheckedAt: null,
  characteristicsCheckNote: null,
};

describe("evidence package", () => {
  it("preserves evidence fields and excludes valuation, execution, custody and pooled-fund fields", () => {
    const pkg = buildEvidencePackage({
      exportedAt: "2026-10-24T11:00:00.000Z",
      scope: { providerListingId: "v1|123", title: "Example watch", profileSlug: "luxury_watches" },
      sourceQuality,
      snapshots: [snapshot],
      currentProviderRead: { itemId: "v1|123", askingPrice: 1010, currency: "GBP", fetchedAt: "2026-10-24T11:00:00.000Z", localizedAspects: [{ name: "Brand" }] },
      characteristicAudits: [{ auditId: "audit-1", action: "checked", occurredAt: "2026-10-24T11:00:00.000Z", note: "Reviewed seller fields" }],
    });
    const serialized = JSON.stringify(pkg);
    expect(pkg.schemaVersion).toBe("top-cherry-evidence-1");
    expect(pkg.snapshots[0]).toMatchObject({ askingPrice: 1000, currency: "GBP", providerListingId: "v1|123" });
    expect(pkg.currentProviderRead).toMatchObject({ askingPrice: 1010, characteristicGroupCount: 1 });
    expect(serialized).not.toMatch(/marketValue|fairValue|margin|execute|checkout|custody|pooled|funds|quantity/i);
  });

  it("does not copy arbitrary fields from snapshot or audit inputs", () => {
    const unsafeSnapshot = Object.assign({}, snapshot, { marketValue: 5000, checkoutUrl: "https://example.invalid" });
    const unsafeAudit = Object.assign({ auditId: "audit-1", action: "checked" as const, occurredAt: "2026-10-24T11:00:00.000Z", note: "ok" }, { custodyDecision: "hold" });
    const result = buildEvidencePackage({
      exportedAt: "2026-10-24T11:00:00.000Z",
      scope: {},
      sourceQuality,
      snapshots: [unsafeSnapshot],
      characteristicAudits: [unsafeAudit],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("marketValue");
    expect(serialized).not.toContain("checkoutUrl");
    expect(serialized).not.toContain("custodyDecision");
  });
});
