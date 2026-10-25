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

export type ProviderReadComparison = {
  state: "unknown" | "unchanged" | "increased" | "decreased";
  currentPrice: number;
  persistedPrice?: number;
  delta?: number;
  currency?: string;
  reason?: "missing-currency" | "currency-mismatch" | "missing-price";
};

export type ProviderReadErrorCategory = "offline" | "unauthorized" | "not-found" | "provider" | "unknown";

export const PROVIDER_READ_MAX_RETRIES = 3;

export function getProviderReadRetryDelayMs(retryAttempt: number): number {
  if (!Number.isFinite(retryAttempt) || retryAttempt <= 0) return 0;
  return Math.min(4_000, 1_000 * 2 ** (Math.ceil(retryAttempt) - 1));
}

/** Classify provider-read failures without exposing raw transport or credential details in the UI. */
export function classifyProviderReadError(error: unknown): ProviderReadErrorCategory {
  const text = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = text.toLowerCase();
  if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("offline") || normalized.includes("timeout")) return "offline";
  if (normalized.includes("401") || normalized.includes("403") || normalized.includes("unauthorized") || normalized.includes("forbidden")) return "unauthorized";
  if (normalized.includes("404") || normalized.includes("not found") || normalized.includes("item not found")) return "not-found";
  if (normalized) return "provider";
  return "unknown";
}

export type SourceQualitySummary = {
  observationCount: number;
  ageCounts: { fresh: number; aging: number; stale: number; unknown: number };
  missingCounts: Record<string, number>;
};

export type SnapshotFreshness = {
  state: "unknown" | "fresh" | "aging" | "stale";
  ageHours?: number;
};

export type SnapshotFreshnessThreshold = {
  freshHours: number;
  agingHours: number;
};

export type SnapshotReconciliationResult = {
  state: "ready" | "needs-attention";
  requiredMissing: string[];
  recommendedMissing: string[];
};

export type ItemDetailCharacteristicCoverage = {
  state: "unavailable" | "partial" | "present";
  aspectCount: number;
  requiredMissing: string[];
  recommendedMissing: string[];
};

export const EBAY_PROFILE_CHARACTERISTIC_RECOMMENDATIONS: Record<string, string[]> = {
  luxury_watches: ["Brand", "Model", "Reference Number", "Condition"],
  cameras: ["Brand", "Model", "Megapixels", "Condition"],
  cars: ["Make", "Model", "Year", "Mileage"],
  audio: ["Brand", "Model", "Connectivity", "Condition"],
  instruments: ["Brand", "Model", "Instrument Family", "Condition"],
  jewellery: ["Brand", "Material", "Main Stone", "Condition"],
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

export function evaluateSnapshotReconciliation(snapshot: Record<string, unknown>): SnapshotReconciliationResult {
  const marketplaceId = typeof snapshot.marketplaceId === "string" ? snapshot.marketplaceId : "";
  const required = marketplaceId.startsWith("EBAY_")
    ? ["providerListingId", "title", "askingPrice", "condition", "sourceFetchedAt"]
    : ["providerListingId", "title", "askingPrice", "sourceFetchedAt"];
  const recommended = marketplaceId.startsWith("EBAY_")
    ? ["currency", "location", "sellerId", "sourceUrl"]
    : ["currency", "sourceUrl"];
  const missing = (field: string) => {
    const value = snapshot[field as keyof ReconciliationSnapshotInput];
    return value === undefined || value === null || (typeof value === "string" && value.trim().length === 0) || (field === "askingPrice" && (!Number.isFinite(value as number) || (value as number) < 0));
  };
  const requiredMissing = required.filter(missing);
  return { state: requiredMissing.length ? "needs-attention" : "ready", requiredMissing, recommendedMissing: recommended.filter(missing) };
}

export function evaluateEbayItemDetailCoverage(detail?: { itemId?: string; title?: string; askingPrice?: number; condition?: string; fetchedAt?: string; profileSlug?: string; localizedAspects?: { name?: string; value?: string }[] | null } | null): ItemDetailCharacteristicCoverage {
  if (!detail) return { state: "unavailable", aspectCount: 0, requiredMissing: ["item detail response"], recommendedMissing: [] };
  const requiredMissing = ["itemId", "title", "askingPrice", "condition", "fetchedAt"].filter((field) => {
    const value = detail[field as keyof typeof detail];
    return value === undefined || value === null || (typeof value === "string" && value.trim().length === 0) || (field === "askingPrice" && (!Number.isFinite(value as number) || (value as number) < 0));
  });
  const validAspects = (detail.localizedAspects ?? []).filter((aspect) => aspect.name?.trim() && aspect.value?.trim());
  const aspectNames = new Set(validAspects.map((aspect) => aspect.name!.trim().toLowerCase()));
  const recommendedMissing = (EBAY_PROFILE_CHARACTERISTIC_RECOMMENDATIONS[detail.profileSlug ?? ""] ?? []).filter((name) => !aspectNames.has(name.toLowerCase()));
  return { state: requiredMissing.length || validAspects.length === 0 ? "partial" : "present", aspectCount: validAspects.length, requiredMissing, recommendedMissing };
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

export function summarizeSnapshotSourceQuality(snapshots: Array<Record<string, unknown>>, now: string | Date = new Date(), threshold: SnapshotFreshnessThreshold = DEFAULT_SNAPSHOT_FRESHNESS_THRESHOLD): SourceQualitySummary {
  const ageCounts = { fresh: 0, aging: 0, stale: 0, unknown: 0 };
  const missingCounts: Record<string, number> = {};
  const fields = ["providerListingId", "title", "askingPrice", "condition", "currency", "location", "sellerId", "sourceUrl"];
  for (const snapshot of snapshots) {
    const freshness = getSnapshotFreshness(String(snapshot.sourceFetchedAt ?? ""), now, threshold);
    ageCounts[freshness.state] += 1;
    for (const field of fields) {
      const value = snapshot[field];
      const missing = value === undefined || value === null || (typeof value === "string" && value.trim().length === 0) || (field === "askingPrice" && (!Number.isFinite(value as number) || (value as number) < 0));
      if (missing) missingCounts[field] = (missingCounts[field] ?? 0) + 1;
    }
  }
  return { observationCount: snapshots.length, ageCounts, missingCounts };
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

export function compareCurrentProviderReadToSnapshot(input: { providerPrice?: number; providerCurrency?: string | null; persistedPrice?: number; persistedCurrency?: string | null }): ProviderReadComparison {
  const providerCurrency = input.providerCurrency ?? undefined;
  const persistedCurrency = input.persistedCurrency ?? undefined;
  if (!Number.isFinite(input.providerPrice) || !Number.isFinite(input.persistedPrice)) return { state: "unknown", currentPrice: input.providerPrice ?? 0, currency: providerCurrency, reason: "missing-price" };
  if (!providerCurrency || !persistedCurrency) return { state: "unknown", currentPrice: input.providerPrice!, currency: providerCurrency, reason: "missing-currency" };
  if (providerCurrency !== persistedCurrency) return { state: "unknown", currentPrice: input.providerPrice!, currency: providerCurrency, reason: "currency-mismatch" };
  const delta = input.providerPrice! - input.persistedPrice!;
  return { state: delta === 0 ? "unchanged" : delta > 0 ? "increased" : "decreased", currentPrice: input.providerPrice!, persistedPrice: input.persistedPrice, delta, currency: providerCurrency };
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
