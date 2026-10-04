export type MarketplaceSource = {
  slug: string;
  name: string;
  mode: "normalized-import";
  status: "adapter-ready" | "credentials-required";
  coverage: "specialist" | "regional-general";
  regions: string[];
  capabilities: string[];
  credentialEnvKey: string;
};

export type NormalizedMarketplaceListing = {
  listingId: string;
  profileSlug: string;
  brand: string;
  model: string;
  askingPrice: number;
  marketValue: number;
  condition: string;
  platformSource: string;
  location?: string;
  countryCode?: string;
  currency?: string;
  escrowProtected: boolean;
  verified: boolean;
  url?: string;
  fetchedAt?: string;
};

export type SyncState = "sample" | "ready" | "syncing" | "synced" | "error" | "blocked";

export type SourceSyncSnapshot = {
  sourceSlug: string;
  state: SyncState;
  lastSyncedAt: string | null;
  recordCount: number;
  message: string;
};

export type PhaseTask = {
  id: string;
  label: string;
  state: "done" | "in-progress" | "blocked" | "next";
};

export const PHASE_ONE_EBAY_TASKS: PhaseTask[] = [
  { id: "developer-app", label: "Create eBay developer application", state: "in-progress" },
  { id: "buy-api-access", label: "Request production Buy API access", state: "blocked" },
  { id: "server-secrets", label: "Store client credentials server-side", state: "next" },
  { id: "browse-adapter", label: "Import Browse API search results", state: "next" },
  { id: "first-sync", label: "Verify first live sync and counts", state: "next" },
];

export const MARKETPLACE_SOURCES: MarketplaceSource[] = [
  { slug: "chrono24", name: "Chrono24", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["EU", "global"], capabilities: ["watches", "escrow", "listing-links"], credentialEnvKey: "CHRONO24_API_KEY" },
  { slug: "ebay", name: "eBay", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["global"], capabilities: ["watches", "camera-gear", "collectibles", "listing-links"], credentialEnvKey: "EBAY_CLIENT_ID" },
  { slug: "mpb", name: "MPB", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["EU", "UK", "US"], capabilities: ["camera-gear", "listing-links"], credentialEnvKey: "MPB_API_KEY" },
  { slug: "goldin", name: "Goldin", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["US", "global"], capabilities: ["collectibles", "listing-links"], credentialEnvKey: "GOLDIN_API_KEY" },
  { slug: "wallapop", name: "Wallapop", mode: "normalized-import", status: "credentials-required", coverage: "regional-general", regions: ["ES", "IT"], capabilities: ["home-and-living", "local-pickup", "general-goods"], credentialEnvKey: "WALLAPOP_API_TOKEN" },
  { slug: "leboncoin", name: "Leboncoin", mode: "normalized-import", status: "credentials-required", coverage: "regional-general", regions: ["FR"], capabilities: ["home-and-living", "local-pickup", "general-goods"], credentialEnvKey: "LEBONCOIN_API_TOKEN" },
  { slug: "kleinanzeigen", name: "Kleinanzeigen", mode: "normalized-import", status: "credentials-required", coverage: "regional-general", regions: ["DE"], capabilities: ["home-and-living", "local-pickup", "general-goods"], credentialEnvKey: "KLEINANZEIGEN_API_KEY" },
  { slug: "marktplaats", name: "Marktplaats", mode: "normalized-import", status: "credentials-required", coverage: "regional-general", regions: ["NL"], capabilities: ["home-and-living", "local-pickup", "general-goods"], credentialEnvKey: "MARKTPLAATS_API_KEY" },
];

export const SOURCE_SYNC_SNAPSHOT: SourceSyncSnapshot[] = MARKETPLACE_SOURCES.map((source) => ({
  sourceSlug: source.slug,
  state: "sample",
  lastSyncedAt: null,
  recordCount: 0,
  message: "No live connector configured; showing sample opportunities only.",
}));

export const getMarketplaceReadiness = (sourceSlug: string, env: NodeJS.ProcessEnv = process.env) => {
  const source = MARKETPLACE_SOURCES.find((candidate) => candidate.slug === sourceSlug);
  if (!source) throw new Error(`Unknown marketplace source: ${sourceSlug}`);
  return { source, configured: Boolean(env[source.credentialEnvKey]), nextStep: env[source.credentialEnvKey] ? "ready-for-sync" : `configure ${source.credentialEnvKey}` };
};

export const scoreNormalizedListing = (listing: NormalizedMarketplaceListing) => {
  const margin = listing.marketValue > 0 ? ((listing.marketValue - listing.askingPrice) / listing.marketValue) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(40 + margin * 1.6 + (listing.escrowProtected ? 12 : 0) + (listing.verified ? 8 : 0))));
  return { ...listing, marginPercentage: Number(margin.toFixed(2)), cherryScore: score };
};

export const canonicalListingKey = (listing: Pick<NormalizedMarketplaceListing, "listingId" | "platformSource" | "url" | "brand" | "model" | "askingPrice">) => {
  if (listing.url) return listing.url.trim().toLowerCase().replace(/\/$/, "");
  if (listing.listingId) return `${listing.platformSource}:${listing.listingId}`.toLowerCase();
  return `${listing.brand}:${listing.model}:${listing.askingPrice}`.trim().toLowerCase().replace(/\s+/g, " ");
};

export const dedupeNormalizedListings = (listings: NormalizedMarketplaceListing[]) => {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    const key = canonicalListingKey(listing);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const previewNormalizedImport = (sourceSlug: string, listings: NormalizedMarketplaceListing[]) => {
  const source = MARKETPLACE_SOURCES.find((candidate) => candidate.slug === sourceSlug);
  if (!source) throw new Error(`Unknown marketplace source: ${sourceSlug}`);
  const uniqueListings = dedupeNormalizedListings(listings);
  return { source, importedCount: uniqueListings.length, duplicateCount: listings.length - uniqueListings.length, listings: uniqueListings.map(scoreNormalizedListing) };
};
