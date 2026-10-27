import { describe, expect, it } from "vitest";
import { buildEvidenceExportAudit, filterEvidenceExportAuditsByWindow, mergeEvidenceExportAudits, recentEvidenceExportAudits, renderEvidenceExportAuditCsv } from "../shared/export-audits";

describe("evidence export audits", () => {
  it("records action metadata without exported content and normalizes full-mode retention", () => {
    const audit = buildEvidenceExportAudit({
      action: "shared",
      format: "markdown",
      privacyMode: "full",
      keepTitles: true,
      keepContext: true,
      scopeLabel: "Repeated failures",
      eventCount: 3.9,
      occurredAt: "2026-10-26T14:00:00.000Z",
    });

    expect(audit).toEqual({
      exportId: "shared:2026-10-26T14:00:00.000Z:markdown",
      action: "shared",
      format: "markdown",
      privacyMode: "full",
      keepTitles: false,
      keepContext: false,
      scopeLabel: "Repeated failures",
      eventCount: 3,
      occurredAt: "2026-10-26T14:00:00.000Z",
    });
    expect(audit).not.toHaveProperty("content");
  });

  it("merges duplicate event IDs without duplicating the immutable audit record", () => {
    const first = buildEvidenceExportAudit({ action: "copied", format: "json", privacyMode: "redacted", keepTitles: false, keepContext: true, scopeLabel: "All groups", eventCount: 1, occurredAt: "2026-10-26T13:00:00.000Z", exportId: "copy-1" });
    const duplicate = { ...first, scopeLabel: "Changed locally" };
    const second = buildEvidenceExportAudit({ action: "shared", format: "json", privacyMode: "redacted", keepTitles: true, keepContext: false, scopeLabel: "Watches", eventCount: 2, occurredAt: "2026-10-26T14:00:00.000Z", exportId: "share-2" });

    expect(mergeEvidenceExportAudits([first], [duplicate, second])).toEqual([second, duplicate]);
  });

  it("presents only the newest bounded audit metadata", () => {
    const older = buildEvidenceExportAudit({ action: "copied", format: "json", privacyMode: "redacted", keepTitles: false, keepContext: false, scopeLabel: "Older", eventCount: 1, occurredAt: "2026-10-26T12:00:00.000Z", exportId: "older" });
    const newer = buildEvidenceExportAudit({ action: "shared", format: "markdown", privacyMode: "redacted", keepTitles: true, keepContext: false, scopeLabel: "Newer", eventCount: 2, occurredAt: "2026-10-26T13:00:00.000Z", exportId: "newer" });
    expect(recentEvidenceExportAudits([older, newer], 1)).toEqual([newer]);
  });

  it("filters audit history by deterministic rolling windows", () => {
    const now = "2026-10-27T12:00:00.000Z";
    const withinSeven = buildEvidenceExportAudit({ action: "copied", format: "json", privacyMode: "redacted", keepTitles: false, keepContext: false, scopeLabel: "Recent", eventCount: 1, occurredAt: "2026-10-23T12:00:00.000Z", exportId: "recent" });
    const withinThirty = buildEvidenceExportAudit({ action: "shared", format: "json", privacyMode: "redacted", keepTitles: false, keepContext: false, scopeLabel: "Month", eventCount: 1, occurredAt: "2026-10-01T12:00:00.000Z", exportId: "month" });
    const older = buildEvidenceExportAudit({ action: "shared", format: "json", privacyMode: "redacted", keepTitles: false, keepContext: false, scopeLabel: "Older", eventCount: 1, occurredAt: "2026-08-01T12:00:00.000Z", exportId: "older" });
    expect(filterEvidenceExportAuditsByWindow([withinSeven, withinThirty, older], "7d", now).map((audit) => audit.exportId)).toEqual(["recent"]);
    expect(filterEvidenceExportAuditsByWindow([withinSeven, withinThirty, older], "30d", now).map((audit) => audit.exportId)).toEqual(["recent", "month"]);
    expect(filterEvidenceExportAuditsByWindow([withinSeven, withinThirty, older], "all", now)).toHaveLength(3);
  });

  it("renders metadata-only CSV with safe escaping and no export identifiers", () => {
    const audit = buildEvidenceExportAudit({ action: "shared", format: "markdown", privacyMode: "redacted", keepTitles: false, keepContext: true, scopeLabel: "Watches, UK", eventCount: 2, occurredAt: "2026-10-27T12:00:00.000Z", exportId: "secret-export-id" });
    const csv = renderEvidenceExportAuditCsv([{ ...audit, syncStatus: "pending-local" }]);
    expect(csv).toContain("action,format,privacy_mode,keep_titles,keep_context,scope,event_count,occurred_at,sync_status");
    expect(csv).toContain('"shared","markdown","redacted","false","true","Watches, UK","2","2026-10-27T12:00:00.000Z","pending-local"');
    expect(csv).not.toContain("secret-export-id");
  });
});
