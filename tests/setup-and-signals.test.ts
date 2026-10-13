import { describe, expect, it } from "vitest";
import { inspectSetup } from "../scripts/setup-check";
import { buildEbayMarketSignals, classifyEbayListingTopic, deriveEbayMarketSignal, summarizeEbayMarketSignals, type ListingObservation } from "../shared/ebay-signals";
import { deliveryLabel, displayCount, displayReceivedAt } from "../shared/monitor-display";
import { summarizeSubscriptions } from "../server/ebay-monitoring";

const observation = (overrides: Partial<ListingObservation>): ListingObservation => ({ eventKey: "first", eventType: "ITEM_PRICE_REVISION", itemId: "item-a", marketplaceId: "EBAY_GB", price: 100, availability: null, currency: "GBP", eventDate: new Date("2026-10-13T10:00:00Z"), receivedAt: new Date("2026-10-13T10:01:00Z"), ...overrides });

describe("repository setup", () => {
  it("can validate sample mode without production credentials", () => {
    const checks = inspectSetup({}, "22.13.0");
    expect(checks.filter((check) => check.required).every((check) => check.ready)).toBe(true);
    expect(checks.find((check) => check.name === "Database")?.ready).toBe(false);
  });
  it("requires a supported Node runtime", () => { expect(inspectSetup({}, "20.0.0")[0].ready).toBe(false); });
  it("reports configuration presence without exposing values", () => {
    const secret = "never-print-this-client-secret";
    const checks = inspectSetup({ EBAY_APP_ID: "app-id", EBAY_CLIENT_SECRET: secret, EBAY_DEV_ID: "a".repeat(36), EBAY_NOTIFICATION_ENDPOINT: "https://example.test/api/ebay/notifications" }, "22.0.0");
    expect(checks.find((check) => check.name === "eBay application credentials")?.ready).toBe(true);
    expect(JSON.stringify(checks)).not.toContain(secret);
  });
});

describe("observed eBay signals", () => {
  it("does not classify account deletion as a market observation", () => { expect(classifyEbayListingTopic("MARKETPLACE_ACCOUNT_DELETION")).toBe("other"); });
  it("requires a baseline before reporting price direction", () => {
    expect(deriveEbayMarketSignal("ITEM_PRICE_REVISION", null, 90).priceDirection).toBe("baseline");
    expect(deriveEbayMarketSignal("ITEM_PRICE_REVISION", null, 90, 100)).toMatchObject({ priceDirection: "down", priceDelta: -10 });
  });
  it("sorts by event time and deduplicates delivery retries", () => {
    const second = observation({ eventKey: "second", price: 90, eventDate: new Date("2026-10-13T11:00:00Z") });
    const signals = buildEbayMarketSignals([second, observation({}), second]);
    expect(signals).toHaveLength(2);
    expect(signals[0]).toMatchObject({ priceDirection: "down", priceDelta: -10 });
    expect(summarizeEbayMarketSignals(signals).priceDrops).toBe(1);
  });
  it("does not compare currencies, marketplaces, different items, or unknown currencies", () => {
    for (const overrides of [{ currency: "EUR" }, { currency: null }, { marketplaceId: "EBAY_DE" }, { itemId: "item-b" }]) {
      const signals = buildEbayMarketSignals([observation({}), observation({ eventKey: "second", price: 90, eventDate: new Date("2026-10-13T11:00:00Z"), ...overrides })]);
      expect(signals[0].priceDirection).toBe("baseline");
    }
  });
  it("distinguishes temporary unavailability and never infers sold", () => {
    const signals = buildEbayMarketSignals([observation({ eventType: "ITEM_AVAILABILITY", price: null, availability: "TEMPORARILY_UNAVAILABLE" })]);
    expect(summarizeEbayMarketSignals(signals)).toMatchObject({ unavailable: 0, temporarilyUnavailable: 1 });
    expect(JSON.stringify(signals)).not.toContain('"sold"');
  });
  it("reports unknown for invalid prices and empty history", () => {
    expect(deriveEbayMarketSignal("ITEM_PRICE_REVISION", null, NaN).priceDirection).toBe("unknown");
    expect(summarizeEbayMarketSignals([])).toMatchObject({ observations: 0, latestObservationAt: null });
  });
});

describe("monitor truth", () => {
  it("does not show missing or failed data as live/zero", () => {
    expect(deliveryLabel(true, false, null)).toBe("LOADING");
    expect(deliveryLabel(false, true, new Date())).toBe("UNAVAILABLE");
    expect(deliveryLabel(false, false, null)).toBe("AWAITING");
    expect(displayCount(undefined)).toBe("—");
    expect(displayCount(0)).toBe("0");
    expect(displayReceivedAt(null)).toBe("No verified delivery yet");
  });
  it("marks listing subscriptions absent without claiming eBay access", () => {
    const result = summarizeSubscriptions({ total: 1, subscriptions: [{ topicId: "MARKETPLACE_ACCOUNT_DELETION", status: "ENABLED" }] });
    expect(result.topics.find((topic) => topic.topicId === "ITEM_AVAILABILITY")?.status).toBe("NOT_ENABLED");
    expect(result.topics.find((topic) => topic.topicId === "MARKETPLACE_ACCOUNT_DELETION")?.status).toBe("ENABLED");
    expect(result).not.toHaveProperty("token");
  });
  it("does not assume subscriptions are missing from an incomplete API page", () => {
    const result = summarizeSubscriptions({ total: 30, subscriptions: [] });
    expect(result.topics.every((topic) => topic.status === "UNKNOWN")).toBe(true);
  });
});
