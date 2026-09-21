export type MarketProfile = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  threshold: number;
  count: number;
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

export const PROFILES: MarketProfile[] = [
  {
    slug: "luxury_watches",
    name: "Luxury watches",
    shortName: "Watches",
    description: "Blue-chip references with strong resale velocity.",
    accent: "#E9F0C0",
    threshold: 35,
    count: 24,
  },
  {
    slug: "camera_gear",
    name: "Camera gear",
    shortName: "Cameras",
    description: "Pro bodies and lenses with predictable demand.",
    accent: "#DCEBFF",
    threshold: 30,
    count: 12,
  },
  {
    slug: "collectibles",
    name: "Collectibles",
    shortName: "Collectibles",
    description: "Scarce pieces where condition makes the spread.",
    accent: "#F8E2D9",
    threshold: 40,
    count: 6,
  },
];

export const LISTINGS: Listing[] = [
  {
    id: "rolex-gmt-126710",
    profileSlug: "luxury_watches",
    brand: "Rolex",
    model: "GMT-Master II 126710BLRO",
    askingPrice: 13800,
    marketValue: 19500,
    score: 94,
    margin: 29.2,
    condition: "Unworn",
    platform: "Chrono24",
    location: "Berlin, DE",
    escrowProtected: true,
    verified: true,
    age: "12 min ago",
    url: "https://www.chrono24.com/rolex/index.htm",
  },
  {
    id: "omega-speedmaster-3861",
    profileSlug: "luxury_watches",
    brand: "Omega",
    model: "Speedmaster Moonwatch 3861",
    askingPrice: 5450,
    marketValue: 7200,
    score: 86,
    margin: 24.3,
    condition: "Full set",
    platform: "eBay",
    location: "New York, US",
    escrowProtected: true,
    verified: true,
    age: "38 min ago",
    url: "https://www.ebay.com/b/Omega-Watches/31387/bn_2184425",
  },
  {
    id: "tudor-black-bay",
    profileSlug: "luxury_watches",
    brand: "Tudor",
    model: "Black Bay 58 Navy",
    askingPrice: 2650,
    marketValue: 3600,
    score: 78,
    margin: 26.4,
    condition: "Very good",
    platform: "Watchfinder",
    location: "London, UK",
    escrowProtected: false,
    verified: true,
    age: "1 hr ago",
    url: "https://www.watchfinder.com/",
  },
  {
    id: "leica-q3",
    profileSlug: "camera_gear",
    brand: "Leica",
    model: "Q3 28mm Summilux",
    askingPrice: 4750,
    marketValue: 6100,
    score: 91,
    margin: 22.1,
    condition: "Like new",
    platform: "MPB",
    location: "Brighton, UK",
    escrowProtected: true,
    verified: true,
    age: "24 min ago",
    url: "https://www.mpb.com/en-uk",
  },
  {
    id: "sony-a7r-v",
    profileSlug: "camera_gear",
    brand: "Sony",
    model: "A7R V body only",
    askingPrice: 2480,
    marketValue: 3150,
    score: 79,
    margin: 21.3,
    condition: "Excellent",
    platform: "eBay",
    location: "Paris, FR",
    escrowProtected: true,
    verified: false,
    age: "2 hrs ago",
    url: "https://www.ebay.com/b/Sony-Digital-Cameras/31388/bn_7119166",
  },
  {
    id: "pokemon-charizard",
    profileSlug: "collectibles",
    brand: "Pokémon",
    model: "Base Set Charizard 1st Ed.",
    askingPrice: 12200,
    marketValue: 20800,
    score: 96,
    margin: 41.3,
    condition: "PSA 8",
    platform: "Goldin",
    location: "Los Angeles, US",
    escrowProtected: true,
    verified: true,
    age: "3 hrs ago",
    url: "https://goldin.co/",
  },
];

export const getProfile = (slug: string) =>
  PROFILES.find((profile) => profile.slug === slug) ?? PROFILES[0];

export const getProfileListings = (slug: string) =>
  LISTINGS.filter((listing) => listing.profileSlug === slug);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export const getInitials = (value: string) => value.slice(0, 2).toUpperCase();
