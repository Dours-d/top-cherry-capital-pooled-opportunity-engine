export type MarketProfile = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  threshold: number;
  count: number;
  icon: "watch" | "photo-camera" | "style" | "headphones" | "directions-car" | "music-note" | "diamond" | "sports-soccer";
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
};

export const PROFILE_STORAGE_KEY = "topCherry.activeProfile";
export const SAVED_STORAGE_KEY = "topCherry.savedListings";
export const NOTIFICATIONS_STORAGE_KEY = "topCherry.notifications";

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
];

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
];

export const getProfile = (slug: string) => PROFILES.find((profile) => profile.slug === slug) ?? PROFILES[0];
export const getProfileListings = (slug: string) => LISTINGS.filter((listing) => listing.profileSlug === slug);

export const recommendAllocations = (budget: number, listings: Listing[] = LISTINGS): Record<string, number> => {
  const safeBudget = Math.max(0, Math.floor(budget));
  let best: { allocations: Record<string, number>; upside: number; score: number; count: number } = { allocations: {}, upside: 0, score: 0, count: 0 };
  const visit = (index: number, remaining: number, allocations: Record<string, number>, upside: number, score: number, count: number) => {
    if (index >= listings.length) {
      const better = upside > best.upside || (upside === best.upside && score > best.score) || (upside === best.upside && score === best.score && count > best.count);
      if (better) best = { allocations: { ...allocations }, upside, score, count };
      return;
    }
    const listing = listings[index];
    const unitUpside = Math.max(0, listing.marketValue - listing.askingPrice);
    const maxUnits = Math.min(4, Math.floor(remaining / listing.askingPrice));
    for (let units = 0; units <= maxUnits; units += 1) {
      if (units > 0) allocations[listing.id] = units;
      else delete allocations[listing.id];
      visit(index + 1, remaining - units * listing.askingPrice, allocations, upside + units * unitUpside, score + units * listing.score, count + units);
    }
    delete allocations[listing.id];
  };
  visit(0, safeBudget, {}, 0, 0, 0);
  return best.allocations;
};

export const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
export const getInitials = (value: string) => value.slice(0, 2).toUpperCase();
