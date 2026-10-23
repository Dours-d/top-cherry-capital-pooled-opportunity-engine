import type { SyncedListingOutcome } from "./listing-outcomes";

export type PendingOutcomeRecord = SyncedListingOutcome & {
  syncError?: string;
  lastAttemptAt?: string;
};

export type OutcomeSyncDismissal = {
  outcomeId: string;
  clearedAt: string;
  note: string;
  restoredAt?: string;
  restoreNote?: string;
};

export type OutcomeSyncAuditRecord = {
  auditId: string;
  outcomeId: string;
  action: "dismissed" | "restored";
  occurredAt: string;
  note: string;
};

export type PendingOutcomeSyncAudit = OutcomeSyncAuditRecord & {
  syncError?: string;
  lastAttemptAt?: string;
};

export function mergeOutcomeSyncAudits(local: OutcomeSyncAuditRecord[], remote: OutcomeSyncAuditRecord[], limit = 100): OutcomeSyncAuditRecord[] {
  const byId = new Map<string, OutcomeSyncAuditRecord>();
  for (const audit of [...local, ...remote]) {
    const existing = byId.get(audit.auditId);
    if (!existing || audit.occurredAt > existing.occurredAt || (audit.occurredAt === existing.occurredAt && JSON.stringify(audit) > JSON.stringify(existing))) {
      byId.set(audit.auditId, audit);
    }
  }
  return [...byId.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}

export function dismissalsFromOutcomeSyncAudits(audits: OutcomeSyncAuditRecord[], fallback: OutcomeSyncDismissal[] = []): OutcomeSyncDismissal[] {
  const byOutcome = new Map<string, OutcomeSyncDismissal>();
  for (const record of fallback) byOutcome.set(record.outcomeId, record);
  for (const audit of [...audits].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
    if (audit.action === "dismissed") {
      byOutcome.set(audit.outcomeId, { outcomeId: audit.outcomeId, clearedAt: audit.occurredAt, note: audit.note });
    } else {
      const existing = byOutcome.get(audit.outcomeId);
      if (existing) byOutcome.set(audit.outcomeId, { ...existing, restoredAt: audit.occurredAt, restoreNote: audit.note });
    }
  }
  return [...byOutcome.values()].sort((a, b) => (b.restoredAt ?? b.clearedAt).localeCompare(a.restoredAt ?? a.clearedAt)).slice(0, 50);
}

export function dismissPendingOutcome(
  pending: PendingOutcomeRecord[],
  dismissals: OutcomeSyncDismissal[],
  outcomeId: string,
  note: string,
  clearedAt: string,
) {
  const trimmed = note.trim();
  if (!trimmed || !pending.some((record) => record.id === outcomeId)) return null;
  return {
    pending: pending.filter((record) => record.id !== outcomeId),
    dismissals: [{ outcomeId, clearedAt, note: trimmed }, ...dismissals].slice(0, 50),
  };
}

export function restoreDismissedOutcome(
  pending: PendingOutcomeRecord[],
  dismissals: OutcomeSyncDismissal[],
  outcomes: SyncedListingOutcome[],
  outcomeId: string,
  note: string,
  restoredAt: string,
) {
  const trimmed = note.trim();
  const outcome = outcomes.find((item) => item.id === outcomeId);
  const dismissal = dismissals.find((item) => item.outcomeId === outcomeId);
  if (!trimmed || !outcome || !dismissal || dismissal.restoredAt || pending.some((record) => record.id === outcomeId)) return null;
  return {
    pending: [...pending, { ...outcome, syncError: "Restored after an intentional dismissal; retry required." }],
    dismissals: dismissals.map((item) => item.outcomeId === outcomeId ? { ...item, restoredAt, restoreNote: trimmed } : item),
  };
}
