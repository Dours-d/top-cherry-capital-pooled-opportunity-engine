export const CHARACTERISTIC_CHECK_AUDIT_QUEUE_STORAGE_KEY = "topCherry.characteristicCheckAuditQueue";

export type PendingCharacteristicCheck = {
  auditId: string;
  snapshotId: string;
  note: string;
  lastAttemptAt?: string;
  syncError?: string;
};

export function enqueueCharacteristicCheck(
  queue: PendingCharacteristicCheck[],
  item: PendingCharacteristicCheck,
): PendingCharacteristicCheck[] {
  return [item, ...queue.filter((existing) => existing.auditId !== item.auditId)].slice(0, 100);
}

export function resolveCharacteristicCheck(
  queue: PendingCharacteristicCheck[],
  auditId: string,
  result: { ok: true } | { ok: false; error: string },
  attemptedAt: string,
): PendingCharacteristicCheck[] {
  if (result.ok) return queue.filter((item) => item.auditId !== auditId);
  return queue.map((item) => item.auditId === auditId ? { ...item, lastAttemptAt: attemptedAt, syncError: result.error } : item);
}

export function normalizeCharacteristicCheckQueue(value: unknown): PendingCharacteristicCheck[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PendingCharacteristicCheck => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<PendingCharacteristicCheck>;
    return typeof candidate.auditId === "string" && typeof candidate.snapshotId === "string" && typeof candidate.note === "string" && candidate.note.trim().length > 0;
  }).slice(0, 100);
}
