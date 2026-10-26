import { describe, expect, it } from "vitest";
import { buildEvidenceExportAudit, mergeEvidenceExportAudits } from "../shared/export-audits";

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
});
