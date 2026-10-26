import { describe, expect, it } from "vitest";
import { buildEvidenceFilename, buildEvidencePackage, redactEvidencePackage, renderEvidencePackageMarkdown } from "../shared/evidence-package";

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
  it("builds safe filenames from provider listing IDs and formats", () => {
    expect(buildEvidenceFilename("v1|123/secret", "json")).toBe("top-cherry-v1-123-secret-evidence.json");
    expect(buildEvidenceFilename("v1|123/secret", "markdown")).toBe("top-cherry-v1-123-secret-evidence.md");
    expect(buildEvidenceFilename(undefined, "json")).toBe("top-cherry-listing-evidence.json");
  });

  it("preserves evidence fields and excludes valuation, execution, custody and pooled-fund fields", () => {
    const pkg = buildEvidencePackage({
      exportedAt: "2026-10-24T11:00:00.000Z",
      scope: { providerListingId: "v1|123", title: "Example watch", profileSlug: "luxury_watches" },
      sourceQuality,
      snapshots: [snapshot],
      currentProviderRead: { itemId: "v1|123", askingPrice: 1010, currency: "GBP", fetchedAt: "2026-10-24T11:00:00.000Z", localizedAspects: [{ name: "Brand" }] },
      characteristicAudits: [{ auditId: "audit-1", action: "checked", occurredAt: "2026-10-24T11:00:00.000Z", note: "Reviewed seller fields" }],
      retryResetAudits: [{ resetId: "reset-1", providerListingId: "v1|123", previousAttemptCount: 3, occurredAt: "2026-10-24T11:30:00.000Z", note: "Provider read budget reopened for a fresh observation", syncStatus: "account-synced" }],
    });
    const serialized = JSON.stringify(pkg);
    expect(pkg.schemaVersion).toBe("top-cherry-evidence-1");
    expect(pkg.snapshots[0]).toMatchObject({ askingPrice: 1000, currency: "GBP", providerListingId: "v1|123" });
    expect(pkg.currentProviderRead).toMatchObject({ askingPrice: 1010, characteristicGroupCount: 1 });
    expect(pkg.retryResetAudits).toMatchObject([{ resetId: "reset-1", previousAttemptCount: 3, syncStatus: "account-synced" }]);
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

  it("renders a readable Markdown record from the same allowlisted package", () => {
    const pkg = buildEvidencePackage({ exportedAt: "2026-10-24T11:00:00.000Z", scope: { title: "Example | watch" }, sourceQuality, snapshots: [snapshot], characteristicAudits: [] });
    const markdown = renderEvidencePackageMarkdown(pkg);
    expect(markdown).toContain("# Top Cherry evidence package");
    expect(markdown).toContain("| 2026-10-24T10:00:00.000Z | 1000 GBP | observed | not checked |");
    expect(markdown).toContain("Example \\| watch");
    expect(markdown).toContain("No provider-read retry-reset audit events recorded.");
    expect(markdown).toContain("not a valuation");
  });

  it("keeps pending retry-reset exports allowlisted", () => {
    const unsafeReset = Object.assign({ resetId: "reset-2", providerListingId: "v1|123", previousAttemptCount: 2, occurredAt: "2026-10-24T11:00:00.000Z", note: "Retry later", syncStatus: "pending-local" as const }, { marketValue: 5000, execute: true, custody: "hold", pooledFunds: 100 });
    const pkg = buildEvidencePackage({ exportedAt: "2026-10-24T11:00:00.000Z", scope: {}, sourceQuality, snapshots: [], characteristicAudits: [], retryResetAudits: [unsafeReset] });
    const serialized = JSON.stringify(pkg);
    expect(pkg.retryResetAudits).toMatchObject([{ resetId: "reset-2", syncStatus: "pending-local" }]);
    expect(serialized).not.toMatch(/marketValue|execute|custody|pooledFunds/i);
  });

  it("redacts identifiers and operator notes without changing evidence values", () => {
    const pkg = buildEvidencePackage({
      exportedAt: "2026-10-24T11:00:00.000Z",
      scope: { providerListingId: "v1|123", title: "Example watch", profileSlug: "luxury_watches" },
      sourceQuality,
      snapshots: [{ ...snapshot, reviewNote: "Keep this private" }],
      currentProviderRead: { itemId: "v1|123", askingPrice: 1010, currency: "GBP", fetchedAt: "2026-10-24T11:00:00.000Z" },
      characteristicAudits: [{ auditId: "audit-1", action: "checked", occurredAt: "2026-10-24T11:00:00.000Z", note: "Private reviewer note" }],
      retryResetAudits: [{ resetId: "reset-1", providerListingId: "v1|123", previousAttemptCount: 3, occurredAt: "2026-10-24T11:30:00.000Z", note: "Private retry context", syncStatus: "account-synced" }],
    });
    const redacted = redactEvidencePackage(pkg);
    expect(redacted.scope).toMatchObject({ providerListingId: "[redacted]", title: "[redacted]" });
    expect(redacted.snapshots[0]).toMatchObject({ providerListingId: "[redacted]", marketplaceId: "[redacted]", profileSlug: "[redacted]", askingPrice: 1000, reviewNote: "[redacted]" });
    expect(redacted.currentProviderRead).toMatchObject({ itemId: "[redacted]", askingPrice: 1010, currency: "GBP" });
    expect(redacted.characteristicAudits[0]).toMatchObject({ auditId: "[redacted]", note: "[redacted]" });
    expect(redacted.retryResetAudits[0]).toMatchObject({ resetId: "[redacted]", providerListingId: "[redacted]", note: "[redacted]", previousAttemptCount: 3 });
    expect(JSON.stringify(redacted)).not.toMatch(/v1\|123|Private this|Private reviewer|Private retry/);
  });

  it("can retain titles while redacting identifiers and operator notes", () => {
    const pkg = buildEvidencePackage({
      exportedAt: "2026-10-24T11:00:00.000Z",
      scope: { providerListingId: "v1|123", title: "Example watch", profileSlug: "luxury_watches" },
      sourceQuality,
      snapshots: [{ ...snapshot, reviewNote: "Keep this private" }],
      characteristicAudits: [{ auditId: "audit-1", action: "checked", occurredAt: "2026-10-24T11:00:00.000Z", note: "Private reviewer note" }],
    });
    const redacted = redactEvidencePackage(pkg, { redactTitles: false });
    expect(redacted.scope).toMatchObject({ providerListingId: "[redacted]", title: "Example watch", profileSlug: "[redacted]" });
    expect(redacted.snapshots[0]).toMatchObject({ providerListingId: "[redacted]", marketplaceId: "[redacted]", profileSlug: "[redacted]", title: "Example watch", reviewNote: "[redacted]" });
    expect(redacted.characteristicAudits[0]).toMatchObject({ auditId: "[redacted]", note: "[redacted]" });
    expect(JSON.stringify(redacted)).not.toMatch(/v1\|123|Keep this private|Private reviewer/);
  });

  it("can retain marketplace and profile context while redacting titles, identifiers and notes", () => {
    const pkg = buildEvidencePackage({ exportedAt: "2026-10-24T11:00:00.000Z", scope: { providerListingId: "v1|123", title: "Example watch", profileSlug: "luxury_watches" }, sourceQuality, snapshots: [snapshot], characteristicAudits: [] });
    const redacted = redactEvidencePackage(pkg, { redactContext: false });
    expect(redacted.scope).toMatchObject({ providerListingId: "[redacted]", title: "[redacted]", profileSlug: "luxury_watches" });
    expect(redacted.snapshots[0]).toMatchObject({ snapshotId: "[redacted]", marketplaceId: "EBAY_GB", profileSlug: "luxury_watches", title: "[redacted]", sellerId: "[redacted]" });
    expect(JSON.stringify(redacted)).not.toContain("v1|123");
  });
});
