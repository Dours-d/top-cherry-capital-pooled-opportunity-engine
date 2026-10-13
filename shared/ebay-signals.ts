export const EBAY_MARKET_SIGNAL_TOPICS = ["ITEM_AVAILABILITY", "ITEM_PRICE_REVISION"] as const;
export type EbayListingSignal = "availability" | "price" | "other";
export function classifyEbayListingTopic(topic: string): EbayListingSignal {
  if (topic === "ITEM_AVAILABILITY" || topic === "availability") return "availability";
  if (topic === "ITEM_PRICE_REVISION" || topic === "price") return "price";
  return "other";
}
export type ListingObservation = {
  eventKey: string; eventType: string; itemId: string; marketplaceId: string | null;
  price: number | null; availability: string | null; currency: string | null;
  eventDate: Date | null; receivedAt: Date;
};
export function deriveEbayMarketSignal(topic: string, availability: string | null, price: number | null, previousPrice: number | null = null) {
  const signal = classifyEbayListingTopic(topic);
  const validPrice = price !== null && Number.isFinite(price) && price >= 0;
  const comparable = validPrice && previousPrice !== null && Number.isFinite(previousPrice) && previousPrice >= 0;
  const priceDelta = signal === "price" && comparable ? Number((price! - previousPrice!).toFixed(4)) : null;
  const priceDirection = signal !== "price" || !validPrice ? "unknown" : priceDelta === null ? "baseline" : priceDelta < 0 ? "down" : priceDelta > 0 ? "up" : "unchanged";
  const availabilityState = signal === "availability" && ["AVAILABLE", "UNAVAILABLE", "TEMPORARILY_UNAVAILABLE"].includes(availability ?? "") ? availability! : "unknown";
  return { signal, priceDirection, priceDelta, availabilityState };
}
export function buildEbayMarketSignals(observations: ListingObservation[]) {
  const seen = new Set<string>();
  const previous = new Map<string, number>();
  const ordered = [...observations].sort((a, b) => (a.eventDate ?? a.receivedAt).getTime() - (b.eventDate ?? b.receivedAt).getTime());
  return ordered.filter((row) => {
    if (seen.has(row.eventKey) || classifyEbayListingTopic(row.eventType) === "other") return false;
    seen.add(row.eventKey); return true;
  }).map((row) => {
    const key = JSON.stringify([row.itemId, row.marketplaceId, row.currency]);
    // An unknown currency is not a valid basis for a price comparison.
    const prior = row.currency ? previous.get(key) ?? null : null;
    const derived = deriveEbayMarketSignal(row.eventType, row.availability, row.price, prior);
    if (row.currency && row.price !== null && Number.isFinite(row.price) && row.price >= 0) previous.set(key, row.price);
    return { ...row, ...derived, observedAt: row.eventDate ?? row.receivedAt };
  }).reverse();
}
export function summarizeEbayMarketSignals(signals: ReturnType<typeof buildEbayMarketSignals>) {
  return {
    observations: signals.length,
    priceDrops: signals.filter((row) => row.priceDirection === "down").length,
    priceRises: signals.filter((row) => row.priceDirection === "up").length,
    unavailable: signals.filter((row) => row.availabilityState === "UNAVAILABLE").length,
    temporarilyUnavailable: signals.filter((row) => row.availabilityState === "TEMPORARILY_UNAVAILABLE").length,
    latestObservationAt: signals[0]?.observedAt ?? null,
  };
}
