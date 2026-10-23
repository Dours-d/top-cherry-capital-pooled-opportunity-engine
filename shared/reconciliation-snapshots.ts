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
