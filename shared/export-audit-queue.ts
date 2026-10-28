import type { EvidenceExportAuditRecord } from "./export-audits";

export const EVIDENCE_EXPORT_AUDIT_QUEUE_STORAGE_KEY = "top-cherry.evidence-export-audit-queue.v1";
export const MAX_EVIDENCE_EXPORT_AUDIT_ATTEMPTS = 99;
export const EVIDENCE_EXPORT_AUDIT_RETRY_LIMIT = 3;
export const MAX_EVIDENCE_EXPORT_AUDIT_RESET_HISTORY = 5;
export const MAX_EVIDENCE_EXPORT_AUDIT_RETENTION_HISTORY = 5;
export const EVIDENCE_EXPORT_AUDIT_RETENTION_OPTIONS = [10, 25, 50] as const;
export const EVIDENCE_EXPORT_AUDIT_QUEUE_SOFT_BUDGET = 40000;
export const EVIDENCE_EXPORT_AUDIT_MAINTENANCE_STORAGE_KEY = "top-cherry.evidence-export-audit-maintenance.v1";
export const EVIDENCE_EXPORT_AUDIT_QUEUE_CHECKSUM_STORAGE_KEY = "top-cherry.evidence-export-audit-queue-checksum.v1";
export const EVIDENCE_EXPORT_AUDIT_QUEUE_INTEGRITY_STORAGE_KEY = "top-cherry.evidence-export-audit-queue-integrity.v1";
export const EVIDENCE_EXPORT_AUDIT_SYNC_HEALTH_STORAGE_KEY = "top-cherry.evidence-export-audit-sync-health.v1";
export type EvidenceExportAuditRetention = (typeof EVIDENCE_EXPORT_AUDIT_RETENTION_OPTIONS)[number];

export function parseEvidenceExportAuditRetention(value: unknown): EvidenceExportAuditRetention {
  return value === 10 || value === 25 || value === 50 ? value : 25;
}

export type PendingEvidenceExportAudit = EvidenceExportAuditRecord & {
  attemptCount: number;
  syncError?: string;
  lastAttemptAt?: string;
  retryResetNote?: string;
  retryResetHistory?: EvidenceExportAuditResetHistoryEntry[];
};

export type EvidenceExportAuditResetHistoryEntry = { note: string; occurredAt: string };
export type EvidenceExportAuditRetentionChange = { from: EvidenceExportAuditRetention; to: EvidenceExportAuditRetention; removedCount: number; occurredAt: string };
export type EvidenceExportAuditMaintenance = { action: "compacted" | "reset-notes-cleared"; removedCount: number; occurredAt: string };
export type EvidenceExportAuditIntegrity = { status: "verified" | "review-needed"; checkedAt: string };
export type EvidenceExportAuditSyncHealth = { lastSuccessfulAt?: string; lastFailedAt?: string; successfulDays?: Record<string, number>; failedDays?: Record<string, number> };

export function checksumEvidenceExportAuditQueue(serialized: string): string {
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function parseEvidenceExportAuditIntegrity(raw: string | null): EvidenceExportAuditIntegrity | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    return (item.status === "verified" || item.status === "review-needed") && typeof item.checkedAt === "string" && !Number.isNaN(Date.parse(item.checkedAt)) ? { status: item.status, checkedAt: item.checkedAt } : null;
  } catch {
    return null;
  }
}

export function parseEvidenceExportAuditSyncHealth(raw: string | null): EvidenceExportAuditSyncHealth | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    const lastSuccessfulAt = typeof item.lastSuccessfulAt === "string" && !Number.isNaN(Date.parse(item.lastSuccessfulAt)) ? item.lastSuccessfulAt : undefined;
    const lastFailedAt = typeof item.lastFailedAt === "string" && !Number.isNaN(Date.parse(item.lastFailedAt)) ? item.lastFailedAt : undefined;
    const parseDays = (raw: unknown) => raw && typeof raw === "object" && !Array.isArray(raw) ? Object.fromEntries(Object.entries(raw).filter(([day, count]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && typeof count === "number" && Number.isInteger(count) && count >= 1 && count <= 999).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7)) as Record<string, number> : undefined;
    const successfulDays = parseDays(item.successfulDays);
    const failedDays = parseDays(item.failedDays);
    return lastSuccessfulAt || lastFailedAt || successfulDays && Object.keys(successfulDays).length || failedDays && Object.keys(failedDays).length ? { ...(lastSuccessfulAt ? { lastSuccessfulAt } : {}), ...(lastFailedAt ? { lastFailedAt } : {}), ...(successfulDays && Object.keys(successfulDays).length ? { successfulDays } : {}), ...(failedDays && Object.keys(failedDays).length ? { failedDays } : {}) } : null;
  } catch {
    return null;
  }
}

export function recordEvidenceExportAuditSyncSuccess(health: EvidenceExportAuditSyncHealth | null, occurredAt: string): EvidenceExportAuditSyncHealth {
  const day = new Date(occurredAt).toISOString().slice(0, 10);
  const days = { ...(health?.successfulDays ?? {}), [day]: (health?.successfulDays?.[day] ?? 0) + 1 };
  const successfulDays = Object.fromEntries(Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7));
  return { ...(health ?? {}), lastSuccessfulAt: occurredAt, successfulDays };
}

export function renderEvidenceExportAuditSyncHealthCsv(health: EvidenceExportAuditSyncHealth): string {
  const dates = [...new Set([...Object.keys(health.successfulDays ?? {}), ...Object.keys(health.failedDays ?? {})])].sort().reverse().slice(0, 7);
  return ["date,successful_syncs,failed_syncs", ...dates.map((day) => `${day},${health.successfulDays?.[day] ?? 0},${health.failedDays?.[day] ?? 0}`)].join("\n");
}

export function recordEvidenceExportAuditSyncFailure(health: EvidenceExportAuditSyncHealth | null, occurredAt: string): EvidenceExportAuditSyncHealth {
  const day = new Date(occurredAt).toISOString().slice(0, 10);
  const days = { ...(health?.failedDays ?? {}), [day]: (health?.failedDays?.[day] ?? 0) + 1 };
  const failedDays = Object.fromEntries(Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7));
  return { ...(health ?? {}), lastFailedAt: occurredAt, failedDays };
}

export function parseEvidenceExportAuditMaintenance(raw: string | null): EvidenceExportAuditMaintenance | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    return (item.action === "compacted" || item.action === "reset-notes-cleared") && typeof item.removedCount === "number" && Number.isInteger(item.removedCount) && item.removedCount >= 0 && typeof item.occurredAt === "string" ? { action: item.action, removedCount: item.removedCount, occurredAt: item.occurredAt } : null;
  } catch {
    return null;
  }
}

export function parseEvidenceExportAuditRetentionHistory(value: unknown): EvidenceExportAuditRetentionChange[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isEvidenceExportAuditRetentionChange).slice(0, MAX_EVIDENCE_EXPORT_AUDIT_RETENTION_HISTORY);
}

export function appendEvidenceExportAuditRetentionHistory(existing: readonly EvidenceExportAuditRetentionChange[], entry: EvidenceExportAuditRetentionChange) {
  return [entry, ...existing].slice(0, MAX_EVIDENCE_EXPORT_AUDIT_RETENTION_HISTORY);
}

export function renderEvidenceExportAuditRetentionHistoryCsv(history: readonly EvidenceExportAuditRetentionChange[]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return ["from_capped_limit,to_capped_limit,removed_count,occurred_at", ...history.map((change) => [change.from, change.to, change.removedCount, change.occurredAt].map(escape).join(","))].join("\n");
}

function isEvidenceExportAuditRetentionChange(value: unknown): value is EvidenceExportAuditRetentionChange {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return parseEvidenceExportAuditRetention(entry.from) === entry.from && parseEvidenceExportAuditRetention(entry.to) === entry.to && typeof entry.removedCount === "number" && Number.isInteger(entry.removedCount) && entry.removedCount >= 0 && typeof entry.occurredAt === "string";
}

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
    const retryResetHistory = [...(item.retryResetHistory ?? []), { note: normalizedNote, occurredAt: resetAt }].slice(-MAX_EVIDENCE_EXPORT_AUDIT_RESET_HISTORY);
    return { ...withoutSyncError, attemptCount: 0, retryResetNote: normalizedNote, retryResetHistory, lastAttemptAt: resetAt };
  });
}

export function countEvidenceExportAuditResetNotes(existing: readonly PendingEvidenceExportAudit[]) {
  return existing.reduce((count, item) => count + (item.retryResetHistory?.length ?? (item.retryResetNote ? 1 : 0)), 0);
}

export function clearEvidenceExportAuditResetHistory(existing: readonly PendingEvidenceExportAudit[]): PendingEvidenceExportAudit[] {
  return existing.map(({ retryResetNote: _retryResetNote, retryResetHistory: _retryResetHistory, ...item }) => item);
}

export function trimCappedEvidenceExportAudits(existing: readonly PendingEvidenceExportAudit[], maxCapped: EvidenceExportAuditRetention): PendingEvidenceExportAudit[] {
  const capped = existing.filter((item) => isEvidenceExportAuditRetryLimitReached(item.attemptCount)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const retainedIds = new Set(capped.slice(0, maxCapped).map((item) => item.exportId));
  return existing.filter((item) => !isEvidenceExportAuditRetryLimitReached(item.attemptCount) || retainedIds.has(item.exportId));
}

export function countCappedEvidenceExportAuditsToTrim(existing: readonly PendingEvidenceExportAudit[], maxCapped: EvidenceExportAuditRetention) {
  return Math.max(0, existing.filter((item) => isEvidenceExportAuditRetryLimitReached(item.attemptCount)).length - maxCapped);
}

export function summarizeEvidenceExportAuditQueue(existing: readonly PendingEvidenceExportAudit[]) {
  const serializedSize = JSON.stringify(existing).length;
  return {
    recordCount: existing.length,
    cappedCount: existing.filter((item) => isEvidenceExportAuditRetryLimitReached(item.attemptCount)).length,
    recoverableCount: existing.filter((item) => !isEvidenceExportAuditRetryLimitReached(item.attemptCount)).length,
    serializedSize,
    softBudget: EVIDENCE_EXPORT_AUDIT_QUEUE_SOFT_BUDGET,
    nearSoftBudget: serializedSize >= EVIDENCE_EXPORT_AUDIT_QUEUE_SOFT_BUDGET * 0.8,
    overSoftBudget: serializedSize > EVIDENCE_EXPORT_AUDIT_QUEUE_SOFT_BUDGET,
  };
}

function isPendingEvidenceExportAudit(value: unknown): value is PendingEvidenceExportAudit {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PendingEvidenceExportAudit>;
  return typeof item.exportId === "string" && (item.action === "copied" || item.action === "shared") && (item.format === "json" || item.format === "markdown") && (item.privacyMode === "redacted" || item.privacyMode === "full") && typeof item.keepTitles === "boolean" && typeof item.keepContext === "boolean" && typeof item.scopeLabel === "string" && typeof item.eventCount === "number" && Number.isInteger(item.eventCount) && item.eventCount >= 0 && (item.attemptCount === undefined || (typeof item.attemptCount === "number" && Number.isInteger(item.attemptCount) && item.attemptCount >= 0 && item.attemptCount <= MAX_EVIDENCE_EXPORT_AUDIT_ATTEMPTS)) && (item.retryResetNote === undefined || (typeof item.retryResetNote === "string" && item.retryResetNote.length <= 240)) && (item.retryResetHistory === undefined || (Array.isArray(item.retryResetHistory) && item.retryResetHistory.length <= MAX_EVIDENCE_EXPORT_AUDIT_RESET_HISTORY && item.retryResetHistory.every((entry) => Boolean(entry) && typeof entry === "object" && typeof entry.note === "string" && entry.note.length <= 240 && typeof entry.occurredAt === "string"))) && typeof item.occurredAt === "string";
}

function normalizeAttemptCount(value: number | undefined) {
  return value === undefined ? 0 : Math.min(MAX_EVIDENCE_EXPORT_AUDIT_ATTEMPTS, Math.max(0, Math.trunc(value)));
}
