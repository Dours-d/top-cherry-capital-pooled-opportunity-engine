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
