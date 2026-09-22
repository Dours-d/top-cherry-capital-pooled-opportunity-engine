export type MarketplaceSource = {
  slug: string;
  name: string;
  mode: "normalized-import";
  status: "adapter-ready" | "credentials-required";
  coverage: "specialist" | "regional-general";
  regions: string[];
  capabilities: string[];
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
  escrowProtected: boolean;
  verified: boolean;
  url?: string;
};

export const MARKETPLACE_SOURCES: MarketplaceSource[] = [
  { slug: "chrono24", name: "Chrono24", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["EU", "global"], capabilities: ["watches", "escrow", "listing-links"] },
  { slug: "ebay", name: "eBay", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["global"], capabilities: ["watches", "camera-gear", "collectibles", "listing-links"] },
  { slug: "mpb", name: "MPB", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["EU", "UK", "US"], capabilities: ["camera-gear", "listing-links"] },
  { slug: "goldin", name: "Goldin", mode: "normalized-import", status: "credentials-required", coverage: "specialist", regions: ["US", "global"], capabilities: ["collectibles", "listing-links"] },
  { slug: "wallapop", name: "Wallapop", mode: "normalized-import", status: "credentials-required", coverage: "regional-general", regions: ["ES", "IT"], capabilities: ["home-and-living", "local-pickup", "general-goods"] },
  { slug: "leboncoin", name: "Leboncoin", mode: "normalized-import", status: "credentials-required", coverage: "regional-general", regions: ["FR"], capabilities: ["home-and-living", "local-pickup", "general-goods"] },
  { slug: "kleinanzeigen", name: "Kleinanzeigen", mode: "normalized-import", status: "credentials-required", coverage: "regional-general", regions: ["DE"], capabilities: ["home-and-living", "local-pickup", "general-goods"] },
  { slug: "marktplaats", name: "Marktplaats", mode: "normalized-import", status: "credentials-required", coverage: "regional-general", regions: ["NL"], capabilities: ["home-and-living", "local-pickup", "general-goods"] },
];

export const scoreNormalizedListing = (listing: NormalizedMarketplaceListing) => {
  const margin = listing.marketValue > 0 ? ((listing.marketValue - listing.askingPrice) / listing.marketValue) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(40 + margin * 1.6 + (listing.escrowProtected ? 12 : 0) + (listing.verified ? 8 : 0))));
  return { ...listing, marginPercentage: Number(margin.toFixed(2)), cherryScore: score };
};

export const previewNormalizedImport = (sourceSlug: string, listings: NormalizedMarketplaceListing[]) => {
  const source = MARKETPLACE_SOURCES.find((candidate) => candidate.slug === sourceSlug);
  if (!source) throw new Error(`Unknown marketplace source: ${sourceSlug}`);
  return { source, importedCount: listings.length, listings: listings.map(scoreNormalizedListing) };
};
