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
  affiliateUrl?: string;
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

type EbayItemSummary = {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  condition?: string;
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
  itemLocation?: { country?: string; postalCode?: string };
};

type EbayLocalizedAspect = { name?: string; value?: string; type?: string };
type EbayItemDetail = EbayItemSummary & { description?: string; localizedAspects?: EbayLocalizedAspect[] };

let ebayApplicationToken: { value: string; expiresAt: number } | null = null;

async function getEbayApplicationToken() {
  const clientId = process.env.EBAY_APP_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("eBay Browse credentials are not configured on the server");
  if (ebayApplicationToken && ebayApplicationToken.expiresAt > Date.now() + 60_000) return ebayApplicationToken.value;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", { method: "POST", headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope" });
  if (!response.ok) throw new Error(`eBay OAuth failed with HTTP ${response.status}`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("eBay OAuth returned no application token");
  ebayApplicationToken = { value: payload.access_token, expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 7200) * 1000 };
  return payload.access_token;
}

export const normalizeEbayItemSummary = (item: EbayItemSummary, marketplaceId: string): NormalizedMarketplaceListing => {
  const askingPrice = Number(item.price?.value ?? 0);
  const title = item.title?.trim() || "Untitled eBay listing";
  const words = title.split(/\s+/);
  return { listingId: item.itemId || title, profileSlug: "ebay-live", brand: words[0] || "Unknown", model: title, askingPrice, marketValue: 0, condition: item.condition || "Unknown", platformSource: "eBay", location: item.itemLocation?.country || marketplaceId, countryCode: item.itemLocation?.country, currency: item.price?.currency, escrowProtected: false, verified: false, url: item.itemWebUrl, affiliateUrl: item.itemAffiliateWebUrl, fetchedAt: new Date().toISOString() };
};

export async function searchEbayBrowse(input: { query: string; marketplaceId?: string; categoryId?: string; limit?: number; offset?: number }) {
  const marketplaceId = input.marketplaceId ?? "EBAY_GB";
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", input.query);
  url.searchParams.set("limit", String(Math.min(50, Math.max(1, input.limit ?? 20))));
  url.searchParams.set("offset", String(Math.max(0, Math.floor(input.offset ?? 0))));
  if (input.categoryId) url.searchParams.set("category_ids", input.categoryId);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${await getEbayApplicationToken()}`, "X-EBAY-C-MARKETPLACE-ID": marketplaceId, Accept: "application/json" } });
  if (!response.ok) throw new Error(`eBay Browse search failed with HTTP ${response.status}`);
  const payload = await response.json() as { total?: number; itemSummaries?: EbayItemSummary[] };
  const listings = (payload.itemSummaries ?? []).map((item) => normalizeEbayItemSummary(item, marketplaceId));
  const total = payload.total ?? listings.length;
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  return { source: "ebay", marketplaceId, query: input.query, total, offset, hasMore: offset + listings.length < total, fetchedAt: new Date().toISOString(), listings };
}

export async function getEbayBrowseItem(input: { itemId: string; marketplaceId?: string }) {
  const marketplaceId = input.marketplaceId ?? "EBAY_GB";
  const url = new URL(`https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(input.itemId)}`);
  url.searchParams.set("fieldgroups", "PRODUCT");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${await getEbayApplicationToken()}`, "X-EBAY-C-MARKETPLACE-ID": marketplaceId, Accept: "application/json" } });
  if (!response.ok) throw new Error(`eBay Browse item lookup failed with HTTP ${response.status}`);
  const item = await response.json() as EbayItemDetail;
  return {
    source: "ebay",
    marketplaceId,
    itemId: item.itemId ?? input.itemId,
    title: item.title?.trim() || "Untitled eBay listing",
    description: item.description,
    condition: item.condition || "Unknown",
    askingPrice: Number(item.price?.value ?? 0),
    currency: item.price?.currency,
    localizedAspects: (item.localizedAspects ?? []).filter((aspect) => aspect.name && aspect.value).map((aspect) => ({ name: aspect.name as string, value: aspect.value as string })),
    fetchedAt: new Date().toISOString(),
  };
}

export { classifyEbayListingTopic, deriveEbayMarketSignal, EBAY_MARKET_SIGNAL_TOPICS } from "../shared/ebay-signals";

export type PhaseTask = {
  id: string;
  label: string;
  state: "done" | "in-progress" | "blocked" | "next";
};

export const PHASE_ONE_EBAY_TASKS: PhaseTask[] = [
  { id: "developer-app", label: "Create eBay developer application", state: "done" },
  { id: "buy-api-access", label: "Verify production Browse API access", state: "done" },
  { id: "server-secrets", label: "Store client credentials server-side", state: "done" },
  { id: "browse-adapter", label: "Import Browse API search results", state: "done" },
  { id: "first-sync", label: "Verify first live sync and counts", state: "in-progress" },
];

export const MARKETPLACE_SOURCES: MarketplaceSource[] = [
  { slug: "chrono24", name: "Chrono24", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["EU", "global"], capabilities: ["watches", "escrow", "listing-links"], credentialEnvKey: "CHRONO24_API_KEY" },
  { slug: "ebay", name: "eBay", mode: "normalized-import", status: "adapter-ready", coverage: "specialist", regions: ["global"], capabilities: ["watches", "camera-gear", "collectibles", "listing-links"], credentialEnvKey: "EBAY_APP_ID" },
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
  const configured = Boolean(env[source.credentialEnvKey]) && (sourceSlug !== "ebay" || Boolean(env.EBAY_CLIENT_SECRET));
  return { source, configured, nextStep: configured ? "verify-provider-access" : `configure ${source.credentialEnvKey}` };
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
