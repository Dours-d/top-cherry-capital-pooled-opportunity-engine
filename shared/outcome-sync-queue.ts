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
