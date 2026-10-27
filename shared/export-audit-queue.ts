import type { EvidenceExportAuditRecord } from "./export-audits";

export const EVIDENCE_EXPORT_AUDIT_QUEUE_STORAGE_KEY = "top-cherry.evidence-export-audit-queue.v1";
export const MAX_EVIDENCE_EXPORT_AUDIT_ATTEMPTS = 99;
export const EVIDENCE_EXPORT_AUDIT_RETRY_LIMIT = 3;

export type PendingEvidenceExportAudit = EvidenceExportAuditRecord & {
  attemptCount: number;
  syncError?: string;
  lastAttemptAt?: string;
  retryResetNote?: string;
};

export function parsePendingEvidenceExportAudits(raw: string | null): PendingEvidenceExportAudit[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingEvidenceExportAudit).slice(0, 100).map((item) => ({ ...item, attemptCount: normalizeAttemptCount(item.attemptCount) }));
  } catch {
    return [];
  }
}

export function queueEvidenceExportAudit(existing: readonly PendingEvidenceExportAudit[], audit: EvidenceExportAuditRecord, attemptedAt: string): PendingEvidenceExportAudit[] {
  const next = existing.filter((item) => item.exportId !== audit.exportId);
  const previous = existing.find((item) => item.exportId === audit.exportId);
  return [{ ...audit, attemptCount: previous?.attemptCount ?? 0, lastAttemptAt: attemptedAt }, ...next].slice(0, 100);
}

export function resolveEvidenceExportAudit(existing: readonly PendingEvidenceExportAudit[], exportId: string, result: { ok: true } | { ok: false; error: string }, attemptedAt: string): PendingEvidenceExportAudit[] {
  if (result.ok) return existing.filter((item) => item.exportId !== exportId);
  return existing.map((item) => item.exportId === exportId ? { ...item, attemptCount: Math.min(MAX_EVIDENCE_EXPORT_AUDIT_ATTEMPTS, item.attemptCount + 1), syncError: result.error, lastAttemptAt: attemptedAt } : item);
}

export function isEvidenceExportAuditRetryLimitReached(attemptCount: number) {
  return attemptCount >= EVIDENCE_EXPORT_AUDIT_RETRY_LIMIT;
}

export function resetEvidenceExportAuditRetry(existing: readonly PendingEvidenceExportAudit[], exportId: string, note: string, resetAt: string): PendingEvidenceExportAudit[] {
  const normalizedNote = note.trim().slice(0, 240);
  if (!normalizedNote) return [...existing];
  return existing.map((item) => {
    if (item.exportId !== exportId) return item;
    const { syncError: _syncError, ...withoutSyncError } = item;
    return { ...withoutSyncError, attemptCount: 0, retryResetNote: normalizedNote, lastAttemptAt: resetAt };
  });
}

function isPendingEvidenceExportAudit(value: unknown): value is PendingEvidenceExportAudit {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PendingEvidenceExportAudit>;
  return typeof item.exportId === "string" && (item.action === "copied" || item.action === "shared") && (item.format === "json" || item.format === "markdown") && (item.privacyMode === "redacted" || item.privacyMode === "full") && typeof item.keepTitles === "boolean" && typeof item.keepContext === "boolean" && typeof item.scopeLabel === "string" && typeof item.eventCount === "number" && Number.isInteger(item.eventCount) && item.eventCount >= 0 && (item.attemptCount === undefined || (typeof item.attemptCount === "number" && Number.isInteger(item.attemptCount) && item.attemptCount >= 0 && item.attemptCount <= MAX_EVIDENCE_EXPORT_AUDIT_ATTEMPTS)) && (item.retryResetNote === undefined || (typeof item.retryResetNote === "string" && item.retryResetNote.length <= 240)) && typeof item.occurredAt === "string";
}

function normalizeAttemptCount(value: number | undefined) {
  return value === undefined ? 0 : Math.min(MAX_EVIDENCE_EXPORT_AUDIT_ATTEMPTS, Math.max(0, Math.trunc(value)));
}
