export type SyncedListingOutcome = {
  id: string;
  listingId: string;
  kind: "sale-observed" | "price-revised" | "expired-or-removed" | "unavailable";
  observedAt: string;
  realizedPrice?: number;
  currency?: string;
  note?: string;
};

export function mergeListingOutcomes(local: SyncedListingOutcome[], remote: SyncedListingOutcome[], limit = 100): SyncedListingOutcome[] {
  const byId = new Map<string, SyncedListingOutcome>();
  for (const outcome of [...local, ...remote]) {
    const existing = byId.get(outcome.id);
    if (!existing || outcome.observedAt > existing.observedAt || (outcome.observedAt === existing.observedAt && JSON.stringify(outcome) > JSON.stringify(existing))) {
      byId.set(outcome.id, outcome);
    }
  }
  return [...byId.values()].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).slice(0, limit);
}
