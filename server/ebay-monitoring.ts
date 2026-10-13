import { getEbayApplicationToken } from "./ebay-notifications";
import { EBAY_MARKET_SIGNAL_TOPICS } from "../shared/ebay-signals";

export function summarizeSubscriptions(payload: { total?: number; subscriptions?: { topicId?: string; status?: string }[] }) {
  const rows = payload.subscriptions ?? [];
  const complete = (payload.total ?? rows.length) <= rows.length;
  const topics = ["MARKETPLACE_ACCOUNT_DELETION", ...EBAY_MARKET_SIGNAL_TOPICS].map((topicId) => {
    const subscription = rows.find((row) => row.topicId === topicId && row.status === "ENABLED") ?? rows.find((row) => row.topicId === topicId);
    return { topicId, status: subscription?.status ?? (complete ? "NOT_ENABLED" : "UNKNOWN") };
  });
  return { state: "checked" as const, topics, checkedAt: new Date(), message: "Listing topics require the eBay buy.item.stream scope; callback verification does not grant listing access." };
}
let cache: { value: Awaited<ReturnType<typeof readEbaySubscriptionState>>; expiresAt: number } | null = null;
async function readEbaySubscriptionState() {
  if (!process.env.EBAY_APP_ID || !process.env.EBAY_CLIENT_SECRET) return { state: "unavailable" as const, topics: [], checkedAt: null, message: "Server-side eBay credentials are missing." };
  try {
    const token = await getEbayApplicationToken();
    const response = await fetch("https://api.ebay.com/commerce/notification/v1/subscription", {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { state: "error" as const, topics: [], checkedAt: new Date(), message: `Subscription lookup returned HTTP ${response.status}. Status is unknown.` };
    return summarizeSubscriptions(await response.json());
  } catch {
    return { state: "error" as const, topics: [], checkedAt: new Date(), message: "Subscription lookup is unavailable. Status is unknown; credentials and payloads are not shown." };
  }
}
export async function getEbaySubscriptionState() {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const value = await readEbaySubscriptionState();
  cache = { value, expiresAt: Date.now() + 60000 };
  return value;
}
