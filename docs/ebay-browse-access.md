# eBay Browse access for Top Cherry

## Verified state

On 19 October 2026 the configured production eBay keyset successfully:

1. Minted an application access token with the client-credentials grant.
2. Used the token with `https://api.ebay.com/buy/browse/v1/item_summary/search`.
3. Queried `EBAY_GB` with a read-only `watch` search.
4. Returned live item summaries, GBP asking prices, conditions, seller/location metadata and eBay listing URLs.

The server adapter is `searchEbayBrowse` in `server/marketplace.ts`. It caches the application token server-side, never sends the client secret to the mobile app, and normalizes a Browse item without inventing a market value. The protected tRPC procedure is `marketplace.searchEbay`.

## Required eBay request shape

The Browse API uses an application access token created with the client-credentials grant and the scope `https://api.ebay.com/oauth/api_scope`:

```bash
curl -X POST 'https://api.ebay.com/identity/v1/oauth2/token' \
  -u "$EBAY_APP_ID:$EBAY_CLIENT_SECRET" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'
```

A Browse request must send the returned bearer token. For non-US marketplaces, send `X-EBAY-C-MARKETPLACE-ID`, for example `EBAY_GB`, `EBAY_DE`, `EBAY_FR` or `EBAY_ES`:

```bash
curl 'https://api.ebay.com/buy/browse/v1/item_summary/search?q=watch&limit=20' \
  -H "Authorization: Bearer $EBAY_APPLICATION_TOKEN" \
  -H 'X-EBAY-C-MARKETPLACE-ID: EBAY_GB' \
  -H 'Accept: application/json'
```

## What this enables

Browse gives Top Cherry the public/visible layer: current listing identity, asking price, currency, condition, location, shipping information where returned, buying options, category and the canonical listing URL. It can support a bounded first reconciliation:

```text
live listing -> normalized observation -> provenance record -> candidate review
```

Browse does not establish realized resale value, profit, seller intent, inventory history or demand. `marketValue` therefore remains unknown (`0` in the current normalized contract) until a separate evidence source or an explicitly attached observation supports it.

## What remains gated

The first version is read-only and does not use checkout, bidding, user tokens or funds. It also does not run a recurring collector and does not yet write Browse observations into the mobile listing store.

For production Buy API use beyond the access already verified, eBay states that some Buy APIs are limited-release and intended for approved eBay partners. The formal route is to join or use the eBay Partner Network where required, complete the Buy API application, provide the requested product mockups and data flows, pass the Application Growth Check, and then go live after approval and contracts. Listing-related Notification topics are separately controlled and may require approved-partner scopes; the existing Marketplace Account Deletion callback is not listing data.

## Official sources

- [eBay Get Started with eBay APIs](https://developer.ebay.com/develop/guides/sell/get-started-with-ebay-apis)
- [eBay Get Started on a Buying Application](https://developer.ebay.com/develop/get-started/get-started-on-a-buying-application)
- [eBay Buy API Requirements](https://developer.ebay.com/api-docs/buy/static/buy-requirements.html)
- [eBay Browse API](https://developer.ebay.com/develop/api/buy/browse_api)
- [Browse API item summary search](https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search)
- [eBay OAuth client credentials grant](https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html)
- [eBay notification topics](https://developer.ebay.com/develop/api/buy/notification_events)
