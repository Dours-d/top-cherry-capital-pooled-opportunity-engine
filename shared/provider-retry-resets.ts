export const PROVIDER_RETRY_RESET_PENDING_KEY = "top-cherry.provider-retry-reset-pending.v1";

export type PendingProviderRetryReset = {
  resetId: string;
  providerListingId: string;
  previousAttemptCount: number;
  note: string;
  occurredAt: string;
  lastAttemptAt?: string;
  attemptCount: number;
  lastError?: string;
};

export type RetryResetConnectivityContext = {
  platform: "web" | "native";
  online: boolean | null;
  previousOnline: boolean | null;
  authenticated: boolean;
  hydrated: boolean;
  pendingCount: number;
};

export type RetryResetListingContext = {
  providerListingId: string;
  marketplaceId?: string | null;
  profileSlug?: string | null;
};

export function getProviderRetryResetGroup(providerListingId: string, contexts: readonly RetryResetListingContext[]) {
  const context = contexts.find((item) => item.providerListingId === providerListingId);
  return `${context?.marketplaceId ?? "Unknown marketplace"} / ${context?.profileSlug ?? "unknown profile"}`;
}

export function filterProviderRetryResetsByGroup<T extends { providerListingId: string }>(items: readonly T[], group: string, contexts: readonly RetryResetListingContext[]) {
  if (group === "all") return [...items];
  return items.filter((item) => getProviderRetryResetGroup(item.providerListingId, contexts) === group);
}

export function shouldSyncRetryResetQueueOnConnectivity(context: RetryResetConnectivityContext) {
  return context.platform === "web"
    && context.online === true
    && context.previousOnline !== true
    && context.authenticated
    && context.hydrated
    && context.pendingCount > 0;
}

export function parsePendingProviderRetryResets(raw: string | null): PendingProviderRetryReset[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isPendingProviderRetryReset);
  } catch {
    return [];
  }
}

export function enqueueProviderRetryReset(queue: PendingProviderRetryReset[], entry: PendingProviderRetryReset) {
  const withoutDuplicate = queue.filter((item) => item.resetId !== entry.resetId);
  return [entry, ...withoutDuplicate].slice(0, 50);
}

export function markProviderRetryResetAttempt(
  queue: PendingProviderRetryReset[],
  resetId: string,
  attemptedAt: string,
  error?: string,
) {
  return queue.map((item) => item.resetId === resetId
    ? { ...item, attemptCount: item.attemptCount + 1, lastAttemptAt: attemptedAt, ...(error ? { lastError: error } : {}) }
    : item);
}

export function removeProviderRetryReset(queue: PendingProviderRetryReset[], resetId: string) {
  return queue.filter((item) => item.resetId !== resetId);
}

function isPendingProviderRetryReset(value: unknown): value is PendingProviderRetryReset {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PendingProviderRetryReset>;
  return typeof item.resetId === "string"
    && typeof item.providerListingId === "string"
    && Number.isInteger(item.previousAttemptCount)
    && typeof item.note === "string"
    && typeof item.occurredAt === "string"
    && Number.isInteger(item.attemptCount);
}
