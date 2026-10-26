import type { EvidenceExportAuditRecord } from "./export-audits";

export const EVIDENCE_EXPORT_AUDIT_QUEUE_STORAGE_KEY = "top-cherry.evidence-export-audit-queue.v1";

export type PendingEvidenceExportAudit = EvidenceExportAuditRecord & {
  syncError?: string;
  lastAttemptAt?: string;
};

export function parsePendingEvidenceExportAudits(raw: string | null): PendingEvidenceExportAudit[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingEvidenceExportAudit).slice(0, 100);
  } catch {
    return [];
  }
}

export function queueEvidenceExportAudit(existing: readonly PendingEvidenceExportAudit[], audit: EvidenceExportAuditRecord, attemptedAt: string): PendingEvidenceExportAudit[] {
  const next = existing.filter((item) => item.exportId !== audit.exportId);
  return [{ ...audit, lastAttemptAt: attemptedAt }, ...next].slice(0, 100);
}

export function resolveEvidenceExportAudit(existing: readonly PendingEvidenceExportAudit[], exportId: string, result: { ok: true } | { ok: false; error: string }, attemptedAt: string): PendingEvidenceExportAudit[] {
  if (result.ok) return existing.filter((item) => item.exportId !== exportId);
  return existing.map((item) => item.exportId === exportId ? { ...item, syncError: result.error, lastAttemptAt: attemptedAt } : item);
}

function isPendingEvidenceExportAudit(value: unknown): value is PendingEvidenceExportAudit {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PendingEvidenceExportAudit>;
  return typeof item.exportId === "string" && (item.action === "copied" || item.action === "shared") && (item.format === "json" || item.format === "markdown") && (item.privacyMode === "redacted" || item.privacyMode === "full") && typeof item.keepTitles === "boolean" && typeof item.keepContext === "boolean" && typeof item.scopeLabel === "string" && typeof item.eventCount === "number" && Number.isInteger(item.eventCount) && item.eventCount >= 0 && typeof item.occurredAt === "string";
}
