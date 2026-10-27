import { describe, expect, it } from "vitest";
import { buildEvidenceExportAudit } from "../shared/export-audits";
import { EVIDENCE_EXPORT_AUDIT_RETRY_LIMIT, isEvidenceExportAuditRetryLimitReached, parsePendingEvidenceExportAudits, queueEvidenceExportAudit, resolveEvidenceExportAudit } from "../shared/export-audit-queue";

describe("evidence export audit queue", () => {
  const audit = buildEvidenceExportAudit({ action: "shared", format: "json", privacyMode: "redacted", keepTitles: false, keepContext: false, scopeLabel: "All groups", eventCount: 2, occurredAt: "2026-10-26T14:00:00.000Z" });

  it("rejects malformed records and queues valid audits with attempt metadata", () => {
    const raw = JSON.stringify([audit, { exportId: "bad", action: "shared", eventCount: "two" }, null]);
    expect(parsePendingEvidenceExportAudits(raw)).toHaveLength(1);
    expect(queueEvidenceExportAudit([], audit, "2026-10-26T14:01:00.000Z")[0]).toMatchObject({ ...audit, attemptCount: 0, lastAttemptAt: "2026-10-26T14:01:00.000Z" });
  });

  it("keeps a server failure diagnostic and removes only after confirmation", () => {
    const queued = queueEvidenceExportAudit([], audit, "2026-10-26T14:01:00.000Z");
    const failed = resolveEvidenceExportAudit(queued, audit.exportId, { ok: false, error: "offline" }, "2026-10-26T14:02:00.000Z");
    expect(failed[0]).toMatchObject({ exportId: audit.exportId, attemptCount: 1, syncError: "offline", lastAttemptAt: "2026-10-26T14:02:00.000Z" });
    expect(resolveEvidenceExportAudit(failed, audit.exportId, { ok: true }, "2026-10-26T14:03:00.000Z")).toEqual([]);
  });

  it("defaults legacy queue records to zero attempts and increments only the failed event", () => {
    const legacy = JSON.stringify([{ ...audit, lastAttemptAt: "2026-10-26T14:01:00.000Z" }]);
    const parsed = parsePendingEvidenceExportAudits(legacy);
    expect(parsed[0].attemptCount).toBe(0);
    const second = buildEvidenceExportAudit({ ...audit, exportId: "second", occurredAt: "2026-10-26T14:00:01.000Z" });
    const queued = [...parsed, { ...second, attemptCount: 0 }];
    const failed = resolveEvidenceExportAudit(queued, audit.exportId, { ok: false, error: "offline" }, "2026-10-26T14:04:00.000Z");
    expect(failed.find((item) => item.exportId === audit.exportId)?.attemptCount).toBe(1);
    expect(failed.find((item) => item.exportId === second.exportId)?.attemptCount).toBe(0);
  });

  it("recognizes and preserves the bounded retry limit", () => {
    expect(isEvidenceExportAuditRetryLimitReached(EVIDENCE_EXPORT_AUDIT_RETRY_LIMIT - 1)).toBe(false);
    expect(isEvidenceExportAuditRetryLimitReached(EVIDENCE_EXPORT_AUDIT_RETRY_LIMIT)).toBe(true);
    const finalRetry = { ...audit, attemptCount: EVIDENCE_EXPORT_AUDIT_RETRY_LIMIT - 1 };
    expect(resolveEvidenceExportAudit([finalRetry], audit.exportId, { ok: false, error: "offline" }, "2026-10-26T14:05:00.000Z")[0].attemptCount).toBe(EVIDENCE_EXPORT_AUDIT_RETRY_LIMIT);
  });
});
