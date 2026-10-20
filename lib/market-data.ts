export type MarketProfile = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  threshold: number;
  count: number;
  icon: "watch" | "photo-camera" | "style" | "headphones" | "directions-car" | "music-note" | "diamond" | "sports-soccer" | "home";
};

export type Listing = {
  id: string;
  profileSlug: string;
  brand: string;
  model: string;
  askingPrice: number;
  marketValue: number;
  score: number;
  margin: number;
  condition: string;
  platform: string;
  location: string;
  escrowProtected: boolean;
  verified: boolean;
  age: string;
  url: string;
  affiliateUrl?: string;
  countryCode?: string;
  pickupDistanceKm?: number;
  shippingCost?: number;
  transactionFee?: number;
  travelCost?: number;
  currency?: string;
  sourceMode?: "sample" | "live-asking-price";
};

export type LiveEbayListing = {
  listingId: string;
  profileSlug: string;
  brand: string;
  model: string;
  askingPrice: number;
  condition: string;
  location?: string;
  countryCode?: string;
  currency?: string;
  url?: string;
  affiliateUrl?: string;
  fetchedAt?: string;
};

export type LiveEbayItemDetail = {
  itemId: string;
  title: string;
  description?: string;
  condition: string;
  askingPrice: number;
  currency?: string;
  localizedAspects: { name: string; value: string }[];
  fetchedAt: string;
};

export type AskingPriceDecisionGate = {
  state: "observe-only" | "research-supported";
  canAllocate: boolean;
  leverage: string;
  missingEvidence: string[];
};

export const getAskingPriceDecisionGate = (listing: Listing): AskingPriceDecisionGate => {
  if (listing.sourceMode !== "live-asking-price") {
    return { state: "research-supported", canAllocate: true, leverage: "This prototype record includes a separate research thesis and valuation assumptions.", missingEvidence: [] };
  }
  return {
    state: "observe-only",
    canAllocate: false,
    leverage: "An asking price is the seller's requested entry price. It is useful for affordability, comparison and all-in cost calculation, but it is not proof of value, demand, liquidity or a completed sale.",
    missingEvidence: ["independent benchmark or valuation thesis", "condition and provenance verification", "all-in acquisition cost", "evidence of demand or a credible exit path"],
  };
};

export type ListingOutcomeKind = "sale-observed" | "price-revised" | "expired-or-removed" | "unavailable";

export type ListingOutcome = {
  id: string;
  listingId: string;
  kind: ListingOutcomeKind;
  observedAt: string;
  realizedPrice?: number;
  note?: string;
};

export type MarketSignals = {
  activeComparables: number;
  newListings7d: number;
  removedListings7d: number;
  medianVisibilityDays: number;
  sellerConcentration: "Low" | "Medium" | "High";
  pricePressure: "Falling" | "Stable" | "Rising";
  inventoryPressure: "Expanding" | "Stable" | "Contracting";
  noveltyScore: number;
  propagationScore: number;
  demandDiversity: "Low" | "Medium" | "High";
  networkMomentum: "Early" | "Rising" | "Crowded" | "Established";
  distortionRisk: "Low" | "Medium" | "High";
  actionWindow: "Act now" | "Monitor" | "Wait" | "Avoid";
  actionReason: string;
};

export const PROFILE_STORAGE_KEY = "topCherry.activeProfile";
export const SAVED_STORAGE_KEY = "topCherry.savedListings";
export const NOTIFICATIONS_STORAGE_KEY = "topCherry.notifications";
export const ECONOMICS_STORAGE_KEY = "topCherry.economics";

export type EconomicsAssumptions = {
  homeCountry: string;
  transactionFeeRate: number;
  shippingRate: number;
  travelCostPerKm: number;
};

export const DEFAULT_ECONOMICS: EconomicsAssumptions = {
  homeCountry: "UK",
  transactionFeeRate: 0.03,
  shippingRate: 0.02,
  travelCostPerKm: 0.35,
};

/**
 * Top Cherry categories are normalized investment themes, not marketplace
 * categories. A listing can come from any source and still belong to one of
 * these default themes.
 */
export const PROFILES: MarketProfile[] = [
  { slug: "luxury_watches", name: "Luxury watches", shortName: "Watches", description: "Blue-chip references with strong resale velocity.", accent: "#E9F0C0", threshold: 35, count: 24, icon: "watch" },
  { slug: "camera_gear", name: "Camera gear", shortName: "Cameras", description: "Pro bodies and lenses with predictable demand.", accent: "#DCEBFF", threshold: 30, count: 12, icon: "photo-camera" },
  { slug: "collectibles", name: "Collectibles", shortName: "Collectibles", description: "Scarce pieces where condition makes the spread.", accent: "#F8E2D9", threshold: 40, count: 6, icon: "style" },
  { slug: "premium_audio", name: "Premium audio", shortName: "Audio", description: "Limited production hardware with enthusiast demand.", accent: "#E5D9FF", threshold: 28, count: 9, icon: "headphones" },
  { slug: "performance_cars", name: "Performance cars", shortName: "Cars", description: "Desirable vehicles with supply-led resale strength.", accent: "#FFE1C7", threshold: 25, count: 8, icon: "directions-car" },
  { slug: "musical_instruments", name: "Musical instruments", shortName: "Instruments", description: "Well-kept instruments with durable secondary demand.", accent: "#D8F2E5", threshold: 24, count: 7, icon: "music-note" },
  { slug: "fine_jewellery", name: "Fine jewellery", shortName: "Jewellery", description: "Portable value where provenance and materials matter.", accent: "#F7DCEB", threshold: 32, count: 5, icon: "diamond" },
  { slug: "sports_collectibles", name: "Sports collectibles", shortName: "Sports", description: "Authenticated pieces with event-driven demand.", accent: "#DBE9F5", threshold: 34, count: 8, icon: "sports-soccer" },
  { slug: "home_and_living", name: "Home & living", shortName: "Home", description: "Furniture, appliances, and design pieces suited to local pickup.", accent: "#F1E7D5", threshold: 22, count: 15, icon: "home" },
];

export const EBAY_SEARCH_TERMS: Record<string, string> = {
  luxury_watches: "luxury watch",
  camera_gear: "camera lens",
  collectibles: "collectibles",
  premium_audio: "premium headphones",
  performance_cars: "performance car",
  musical_instruments: "musical instrument",
  fine_jewellery: "fine jewellery",
  sports_collectibles: "sports collectible",
  home_and_living: "designer furniture",
};

export const getEbaySearchTerm = (profileSlug: string) => EBAY_SEARCH_TERMS[profileSlug] ?? "luxury watch";

export const mapLiveEbayListings = (listings: LiveEbayListing[]): Listing[] => listings.map((listing) => ({
  id: `ebay:${listing.listingId}`,
  profileSlug: listing.profileSlug,
  brand: listing.brand,
  model: listing.model,
  askingPrice: listing.askingPrice,
  marketValue: 0,
  score: 0,
  margin: 0,
  condition: listing.condition,
  platform: "eBay",
  location: listing.location ?? listing.countryCode ?? "eBay marketplace",
  countryCode: listing.countryCode,
  escrowProtected: false,
  verified: false,
  age: "just now",
  url: listing.url ?? "https://www.ebay.co.uk/",
  affiliateUrl: listing.affiliateUrl,
  currency: listing.currency ?? "GBP",
  sourceMode: "live-asking-price",
}));

export const LISTINGS: Listing[] = [
  { id: "rolex-gmt-126710", profileSlug: "luxury_watches", brand: "Rolex", model: "GMT-Master II 126710BLRO", askingPrice: 13800, marketValue: 19500, score: 94, margin: 29.2, condition: "Unworn", platform: "Chrono24", location: "Berlin, DE", escrowProtected: true, verified: true, age: "12 min ago", url: "https://www.chrono24.com/rolex/index.htm" },
  { id: "omega-speedmaster-3861", profileSlug: "luxury_watches", brand: "Omega", model: "Speedmaster Moonwatch 3861", askingPrice: 5450, marketValue: 7200, score: 86, margin: 24.3, condition: "Full set", platform: "eBay", location: "New York, US", escrowProtected: true, verified: true, age: "38 min ago", url: "https://www.ebay.com/b/Omega-Watches/31387/bn_2184425" },
  { id: "tudor-black-bay", profileSlug: "luxury_watches", brand: "Tudor", model: "Black Bay 58 Navy", askingPrice: 2650, marketValue: 3600, score: 78, margin: 26.4, condition: "Very good", platform: "Watchfinder", location: "London, UK", escrowProtected: false, verified: true, age: "1 hr ago", url: "https://www.watchfinder.com/" },
  { id: "leica-q3", profileSlug: "camera_gear", brand: "Leica", model: "Q3 28mm Summilux", askingPrice: 4750, marketValue: 6100, score: 91, margin: 22.1, condition: "Like new", platform: "MPB", location: "Brighton, UK", escrowProtected: true, verified: true, age: "24 min ago", url: "https://www.mpb.com/en-uk" },
  { id: "sony-a7r-v", profileSlug: "camera_gear", brand: "Sony", model: "A7R V body only", askingPrice: 2480, marketValue: 3150, score: 79, margin: 21.3, condition: "Excellent", platform: "eBay", location: "Paris, FR", escrowProtected: true, verified: false, age: "2 hrs ago", url: "https://www.ebay.com/b/Sony-Digital-Cameras/31388/bn_7119166" },
  { id: "pokemon-charizard", profileSlug: "collectibles", brand: "Pokémon", model: "Base Set Charizard 1st Ed.", askingPrice: 12200, marketValue: 20800, score: 96, margin: 41.3, condition: "PSA 8", platform: "Goldin", location: "Los Angeles, US", escrowProtected: true, verified: true, age: "3 hrs ago", url: "https://goldin.co/" },
  { id: "focal-utopia", profileSlug: "premium_audio", brand: "Focal", model: "Utopia headphones", askingPrice: 2800, marketValue: 3900, score: 84, margin: 28.2, condition: "Excellent", platform: "Reverb", location: "Amsterdam, NL", escrowProtected: true, verified: true, age: "42 min ago", url: "https://reverb.com/" },
  { id: "porsche-gt3-991", profileSlug: "performance_cars", brand: "Porsche", model: "911 GT3 991.2", askingPrice: 142000, marketValue: 161000, score: 88, margin: 11.8, condition: "Excellent", platform: "Collecting Cars", location: "Monaco", escrowProtected: true, verified: true, age: "1 hr ago", url: "https://collectingcars.com/" },
  { id: "gibson-les-paul-59", profileSlug: "musical_instruments", brand: "Gibson", model: "Custom Shop 1959 Reissue", askingPrice: 5200, marketValue: 7200, score: 87, margin: 27.8, condition: "Near mint", platform: "Reverb", location: "Nashville, US", escrowProtected: false, verified: true, age: "2 hrs ago", url: "https://reverb.com/" },
  { id: "cartier-love-bracelet", profileSlug: "fine_jewellery", brand: "Cartier", model: "Love bracelet, yellow gold", askingPrice: 6100, marketValue: 8200, score: 83, margin: 25.6, condition: "Very good", platform: "The RealReal", location: "Paris, FR", escrowProtected: true, verified: true, age: "3 hrs ago", url: "https://www.therealreal.com/" },
  { id: "jordan-1-chicago", profileSlug: "sports_collectibles", brand: "Nike", model: "Air Jordan 1 Chicago 1985", askingPrice: 4600, marketValue: 6900, score: 90, margin: 33.3, condition: "Authenticated", platform: "StockX", location: "Chicago, US", escrowProtected: true, verified: true, age: "4 hrs ago", url: "https://stockx.com/" },
  { id: "vitra-eames-chair", profileSlug: "home_and_living", brand: "Vitra", model: "Eames Lounge Chair", askingPrice: 2200, marketValue: 3300, score: 82, margin: 33.3, condition: "Very good", platform: "Wallapop", location: "Barcelona, ES", escrowProtected: false, verified: false, age: "18 min ago", url: "https://es.wallapop.com/", countryCode: "ES", pickupDistanceKm: 18 },
  { id: "miele-coffee-system", profileSlug: "home_and_living", brand: "Miele", model: "Built-in coffee system", askingPrice: 900, marketValue: 1500, score: 84, margin: 40, condition: "Excellent", platform: "Leboncoin", location: "Lyon, FR", escrowProtected: false, verified: false, age: "35 min ago", url: "https://www.leboncoin.fr/", countryCode: "FR", pickupDistanceKm: 42 },
  { id: "usm-sideboard", profileSlug: "home_and_living", brand: "USM Haller", model: "Modular sideboard", askingPrice: 1400, marketValue: 2400, score: 86, margin: 41.7, condition: "Good", platform: "Kleinanzeigen", location: "Berlin, DE", escrowProtected: false, verified: false, age: "1 hr ago", url: "https://www.kleinanzeigen.de/", countryCode: "DE", pickupDistanceKm: 75 },
  { id: "design-lamp", profileSlug: "home_and_living", brand: "Flos", model: "Arco floor lamp", askingPrice: 650, marketValue: 1100, score: 83, margin: 40.9, condition: "Very good", platform: "Marktplaats", location: "Amsterdam, NL", escrowProtected: false, verified: false, age: "2 hrs ago", url: "https://www.marktplaats.nl/", countryCode: "NL", pickupDistanceKm: 12 },
];

const SIGNALS_BY_LISTING: Record<string, MarketSignals> = {
  "rolex-gmt-126710": { activeComparables: 42, newListings7d: 19, removedListings7d: 14, medianVisibilityDays: 8.2, sellerConcentration: "Medium", pricePressure: "Stable", inventoryPressure: "Stable", noveltyScore: 32, propagationScore: 39, demandDiversity: "High", networkMomentum: "Established", distortionRisk: "Low", actionWindow: "Monitor", actionReason: "Strong reference market, but the visible price is close to the established range." },
  "omega-speedmaster-3861": { activeComparables: 31, newListings7d: 14, removedListings7d: 22, medianVisibilityDays: 4.1, sellerConcentration: "Medium", pricePressure: "Rising", inventoryPressure: "Contracting", noveltyScore: 58, propagationScore: 66, demandDiversity: "High", networkMomentum: "Rising", distortionRisk: "Low", actionWindow: "Act now", actionReason: "Independent attention is rising while inventory contracts; validate condition before the next repricing wave." },
  "leica-q3": { activeComparables: 18, newListings7d: 11, removedListings7d: 15, medianVisibilityDays: 3.6, sellerConcentration: "Low", pricePressure: "Rising", inventoryPressure: "Contracting", noveltyScore: 71, propagationScore: 74, demandDiversity: "High", networkMomentum: "Rising", distortionRisk: "Low", actionWindow: "Act now", actionReason: "Cross-market interest is propagating faster than prices have adjusted; the edge is strongest below the current threshold." },
  "sony-a7r-v": { activeComparables: 67, newListings7d: 38, removedListings7d: 21, medianVisibilityDays: 12.4, sellerConcentration: "Low", pricePressure: "Falling", inventoryPressure: "Expanding", noveltyScore: 24, propagationScore: 31, demandDiversity: "High", networkMomentum: "Established", distortionRisk: "Low", actionWindow: "Wait", actionReason: "Supply is expanding and prices are softening; a better entry window may appear after the next inventory wave." },
  "vitra-eames-chair": { activeComparables: 12, newListings7d: 6, removedListings7d: 9, medianVisibilityDays: 5.8, sellerConcentration: "High", pricePressure: "Rising", inventoryPressure: "Contracting", noveltyScore: 63, propagationScore: 52, demandDiversity: "Medium", networkMomentum: "Rising", distortionRisk: "Medium", actionWindow: "Monitor", actionReason: "Local supply is thin, but seller concentration is high; verify provenance and compare outside the visible marketplace." },
  "design-lamp": { activeComparables: 26, newListings7d: 17, removedListings7d: 12, medianVisibilityDays: 9.7, sellerConcentration: "Low", pricePressure: "Stable", inventoryPressure: "Stable", noveltyScore: 46, propagationScore: 44, demandDiversity: "Medium", networkMomentum: "Early", distortionRisk: "Low", actionWindow: "Monitor", actionReason: "An early design-led signal is visible, but the network has not yet converted attention into stronger clearing evidence." },
};

export const getListingSignals = (listing: Listing): MarketSignals => SIGNALS_BY_LISTING[listing.id] ?? {
  activeComparables: 20,
  newListings7d: 10,
  removedListings7d: 10,
  medianVisibilityDays: 7,
  sellerConcentration: "Medium",
  pricePressure: "Stable",
  inventoryPressure: "Stable",
  noveltyScore: 40,
  propagationScore: 40,
  demandDiversity: "Medium",
  networkMomentum: "Established",
  distortionRisk: "Medium",
  actionWindow: "Monitor",
  actionReason: "The prototype has insufficient event history to make a stronger timing claim.",
};

export const getProfile = (slug: string) => PROFILES.find((profile) => profile.slug === slug) ?? PROFILES[0];
export const getProfileListings = (slug: string) => LISTINGS.filter((listing) => listing.profileSlug === slug);

export const getListingCountry = (listing: Listing) => listing.countryCode ?? listing.location.split(",").at(-1)?.trim() ?? "";

export const getListingEconomics = (listing: Listing, assumptions: EconomicsAssumptions = DEFAULT_ECONOMICS) => {
  const shipping = listing.shippingCost ?? (listing.pickupDistanceKm ? 0 : Math.round(listing.askingPrice * assumptions.shippingRate));
  const transactionFee = listing.transactionFee ?? Math.round(listing.askingPrice * assumptions.transactionFeeRate);
  const travelCost = listing.travelCost ?? (listing.pickupDistanceKm ? Math.round(listing.pickupDistanceKm * assumptions.travelCostPerKm) : 0);
  const grossUpside = listing.marketValue - listing.askingPrice;
  const totalCosts = shipping + transactionFee + travelCost;
  return { grossUpside, shipping, transactionFee, travelCost, totalCosts, netUpside: grossUpside - totalCosts };
};

export const getAllInAcquisitionCost = (listing: Listing, assumptions: EconomicsAssumptions = DEFAULT_ECONOMICS) => listing.askingPrice + getListingEconomics(listing, assumptions).totalCosts;

export type ReservationStatus = "unreserved" | "reserved";

export const getMaxPlannableQuantity = ({
  budget,
  reserve,
  otherCommitted,
  unitCost,
  confirmedStock,
  reservation,
}: {
  budget: number;
  reserve: number;
  otherCommitted: number;
  unitCost: number;
  confirmedStock: number | null;
  reservation: ReservationStatus;
}) => {
  if (reservation !== "reserved" || confirmedStock === null || confirmedStock <= 0 || unitCost <= 0) return 0;
  return Math.min(confirmedStock, Math.floor(Math.max(0, budget - reserve - otherCommitted) / unitCost));
};

export const getMaxAskingPriceForTarget = ({
  targetExitPrice,
  minimumNetBuffer,
  shippingRate = DEFAULT_ECONOMICS.shippingRate,
  transactionFeeRate = DEFAULT_ECONOMICS.transactionFeeRate,
  fixedTravelCost = 0,
}: {
  targetExitPrice: number;
  minimumNetBuffer: number;
  shippingRate?: number;
  transactionFeeRate?: number;
  fixedTravelCost?: number;
}) => Math.max(0, (targetExitPrice - minimumNetBuffer - Math.max(0, fixedTravelCost)) / (1 + Math.max(0, shippingRate) + Math.max(0, transactionFeeRate)));

export const recommendAllocations = (budget: number, listings: Listing[] = LISTINGS, assumptions: EconomicsAssumptions = DEFAULT_ECONOMICS, reserve = 0): Record<string, number> => {
  const safeBudget = Math.max(0, Math.floor(budget - Math.max(0, reserve)));
  let best: { allocations: Record<string, number>; upside: number; score: number; count: number } = { allocations: {}, upside: 0, score: 0, count: 0 };
  const visit = (index: number, remaining: number, allocations: Record<string, number>, upside: number, score: number, count: number) => {
    if (index >= listings.length) {
      const better = upside > best.upside || (upside === best.upside && score > best.score) || (upside === best.upside && score === best.score && count > best.count);
      if (better) best = { allocations: { ...allocations }, upside, score, count };
      return;
    }
    const listing = listings[index];
    const unitUpside = Math.max(0, getListingEconomics(listing, assumptions).netUpside);
    const maxUnits = Math.min(4, Math.floor(remaining / getAllInAcquisitionCost(listing, assumptions)));
    for (let units = 0; units <= maxUnits; units += 1) {
      if (units > 0) allocations[listing.id] = units;
      else delete allocations[listing.id];
      visit(index + 1, remaining - units * getAllInAcquisitionCost(listing, assumptions), allocations, upside + units * unitUpside, score + units * listing.score, count + units);
    }
    delete allocations[listing.id];
  };
  visit(0, safeBudget, {}, 0, 0, 0);
  return best.allocations;
};

export const formatCurrency = (value: number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
export const getInitials = (value: string) => value.slice(0, 2).toUpperCase();
