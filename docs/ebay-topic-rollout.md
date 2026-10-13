# eBay topic rollout

## Current status — 13 October 2026

The application has a working account-deletion callback and an enabled `MARKETPLACE_ACCOUNT_DELETION` subscription. That subscription is a compliance event source, not a listing feed.

A read-only application-token request for `https://api.ebay.com/oauth/api_scope/buy.item.stream` returned HTTP 400 with `invalid_scope` at 17:07 UTC. The response states that the requested scope is invalid, unknown, malformed, or exceeds the scope granted to the client. The official topic catalog assigns that scope to `ITEM_AVAILABILITY` and `ITEM_PRICE_REVISION`; its documentation describes these topics as restricted to eBay Partner Network partners. No item-stream subscription was created after this permission failure. An ordinary developer account does not establish that permission.

## Prepared implementation

Verified callbacks normalize the supported item topics, reject invalid prices, retain the original topic name, and store idempotent listing events. The signal query loads a bounded window of 200 verified listing events, sorts by event time, and deduplicates event keys. Price direction requires earlier observations for the same item, marketplace, and known currency. A first observation is a baseline, not a price rise or drop. Temporary unavailability remains distinct from permanent unavailability; neither is proof of a sale.

Workspace shows real notification and listing-event counts, last receipt time, current enabled subscriptions, and the observed signal counts. Aggregate monitoring is public without raw payloads or personal identifiers; item-level history requires sign-in. Loading, absent data, and unavailable services are not shown as successful live feeds. The existing sample opportunity feed remains explicitly sample data.

## Next activation gate

The account owner must obtain eBay authorization for `buy.item.stream` through the applicable partner/access process. After permission is granted, run `pnpm ebay:access` once to verify authorization, then create or enable the two listing subscriptions on the existing destination. Verify receipt and persistence of topic-specific tests before labeling market observations live. Filters and coverage must be agreed for the intended marketplace/category scope before relying on production volume.

No credential replacement or change to the working callback token is required to solve this authorization gate. Browse API access is a separate capability and should be verified independently.

## Official references

- [eBay Notification API](https://developer.ebay.com/develop/api/sell/notification_api)
- [eBay Notification Topics and restricted scope requirements](https://developer.ebay.com/develop/api/buy/notification_events)
- [eBay Subscription API](https://developer.ebay.com/api-docs/commerce/notification/resources/subscription/methods/create)
