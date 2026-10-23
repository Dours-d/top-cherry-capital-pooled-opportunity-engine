import type { LiveEbayListing } from "../lib/market-data";

export type ReconciliationSnapshotInput = {
  snapshotId: string;
  sourceSlug: string;
  marketplaceId: string;
  query: string;
  providerListingId: string;
  profileSlug: string;
  title: string;
  askingPrice: number;
  currency?: string;
  condition: string;
  location?: string;
  sellerId?: string;
  sourceUrl?: string;
  sourceFetchedAt: string;
  reconciliationStatus: "observed" | "reviewed" | "superseded";
};

export type SnapshotComparison = {
  state: "unknown" | "unchanged" | "increased" | "decreased";
  currentPrice: number;
  priorPrice?: number;
  delta?: number;
  currency?: string;
  comparableObservationCount: number;
};

export type SnapshotFreshness = {
  state: "unknown" | "fresh" | "aging" | "stale";
  ageHours?: number;
};

export type SnapshotFreshnessThreshold = {
  freshHours: number;
  agingHours: number;
};

export const DEFAULT_SNAPSHOT_FRESHNESS_THRESHOLD: SnapshotFreshnessThreshold = { freshHours: 24, agingHours: 168 };
export const SNAPSHOT_FRESHNESS_PRESETS: SnapshotFreshnessThreshold[] = [
  { freshHours: 12, agingHours: 72 },
  DEFAULT_SNAPSHOT_FRESHNESS_THRESHOLD,
  { freshHours: 48, agingHours: 336 },
];

export function normalizeSnapshotFreshnessThreshold(input?: Partial<SnapshotFreshnessThreshold> | null): SnapshotFreshnessThreshold {
  const freshHours = Number.isFinite(input?.freshHours) ? Math.max(1, Math.min(720, input!.freshHours!)) : DEFAULT_SNAPSHOT_FRESHNESS_THRESHOLD.freshHours;
  const agingHours = Number.isFinite(input?.agingHours) ? Math.max(freshHours + 1, Math.min(2_160, input!.agingHours!)) : DEFAULT_SNAPSHOT_FRESHNESS_THRESHOLD.agingHours;
  return { freshHours, agingHours };
}

export function nextSnapshotFreshnessThreshold(current?: SnapshotFreshnessThreshold | null): SnapshotFreshnessThreshold {
  const normalized = normalizeSnapshotFreshnessThreshold(current);
  const index = SNAPSHOT_FRESHNESS_PRESETS.findIndex((preset) => preset.freshHours === normalized.freshHours && preset.agingHours === normalized.agingHours);
  return SNAPSHOT_FRESHNESS_PRESETS[(index + 1) % SNAPSHOT_FRESHNESS_PRESETS.length];
}

/**
 * Age is a data-quality prompt only. It is not an availability, sale, value,
 * or stock inference. Thresholds are intentionally coarse and visible to the UI.
 */
export function getSnapshotFreshness(sourceFetchedAt: string | Date, now: string | Date = new Date(), threshold: SnapshotFreshnessThreshold = DEFAULT_SNAPSHOT_FRESHNESS_THRESHOLD): SnapshotFreshness {
  const fetchedMs = new Date(sourceFetchedAt).getTime();
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(fetchedMs) || !Number.isFinite(nowMs)) return { state: "unknown" };
  const ageHours = Math.max(0, (nowMs - fetchedMs) / 3_600_000);
  const normalized = normalizeSnapshotFreshnessThreshold(threshold);
  return { state: ageHours <= normalized.freshHours ? "fresh" : ageHours <= normalized.agingHours ? "aging" : "stale", ageHours };
}

export function compareSnapshotToPrior<T extends { providerListingId: string; askingPrice: number; currency?: string | null; sourceFetchedAt: string | Date }>(current: T, history: T[]): SnapshotComparison {
  const currency = current.currency ?? undefined;
  const comparable = history
    .filter((item) => item.providerListingId === current.providerListingId && (item.currency ?? undefined) === currency && new Date(item.sourceFetchedAt).getTime() < new Date(current.sourceFetchedAt).getTime())
    .sort((a, b) => new Date(b.sourceFetchedAt).getTime() - new Date(a.sourceFetchedAt).getTime());
  const prior = comparable[0];
  if (!prior || !currency) return { state: "unknown", currentPrice: current.askingPrice, currency, comparableObservationCount: comparable.length };
  const delta = current.askingPrice - prior.askingPrice;
  return { state: delta === 0 ? "unchanged" : delta > 0 ? "increased" : "decreased", currentPrice: current.askingPrice, priorPrice: prior.askingPrice, delta, currency, comparableObservationCount: comparable.length };
}

export function buildEbayReconciliationSnapshot(input: {
  listing: LiveEbayListing;
  marketplaceId: string;
  query: string;
  profileSlug: string;
  sourceFetchedAt: string;
}): ReconciliationSnapshotInput {
  const { listing, marketplaceId, query, profileSlug, sourceFetchedAt } = input;
  return {
    snapshotId: `ebay:${marketplaceId}:${sourceFetchedAt}:${listing.listingId}`,
    sourceSlug: "ebay",
    marketplaceId,
    query,
    providerListingId: listing.listingId,
    profileSlug,
    title: listing.model,
    askingPrice: listing.askingPrice,
    ...(listing.currency ? { currency: listing.currency } : {}),
    condition: listing.condition,
    ...(listing.location ? { location: listing.location } : {}),
    ...(listing.sellerId ? { sellerId: listing.sellerId } : {}),
    ...(listing.url ? { sourceUrl: listing.url } : {}),
    sourceFetchedAt,
    reconciliationStatus: "observed",
  };
}
