# eBay Browse access for Top Cherry

## Verified state

On 19 October 2026 the configured production eBay keyset successfully:

1. Minted an application access token with the client-credentials grant.
2. Used the token with `https://api.ebay.com/buy/browse/v1/item_summary/search`.
3. Queried `EBAY_GB` with a read-only `watch` search.
4. Returned live item summaries, GBP asking prices, conditions, seller/location metadata and eBay listing URLs.

The server adapter is `searchEbayBrowse` in `server/marketplace.ts`. It caches the application token server-side, never sends the client secret to the mobile app, and normalizes a Browse item without inventing a market value. The public tRPC procedure is `marketplace.searchEbay`; it is bounded to 50 records per request and uses server-side credentials only. Discover currently requests 20 records, supports refresh, and can advance by 20-record offsets.

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

## Item characteristics: what is available now

The absence of item characteristics in the first live cards is an implementation boundary, not proof that the account is unauthorized. The current adapter reads `item_summary/search`, but only maps the summary fields needed for an asking-price observation. eBay's `getItem` method can return the detailed item record, including description, category, all returned item aspects, condition, seller feedback, shipping options and delivery information. It accepts an application access token with the standard client-credentials scope. Requesting `fieldgroups=PRODUCT` adds product information; the default response includes the detailed item information where the listing supplies it.

Search can also request `fieldgroups=ASPECT_REFINEMENTS` to discover the dominant category and available aspect refinements, then use `category_ids` plus `aspect_filter` to narrow a search. Aspect coverage is listing- and category-dependent: eBay cannot return a characteristic the seller did not provide. Vehicle-part compatibility is a separate path and is currently limited to cars, trucks and motorcycles; use the Taxonomy API's compatibility-property method to construct those filters.

The next data-layer step for Top Cherry is therefore `live listing -> getItem detail -> localizedAspects/product/shipping observation`, with each field retaining retrieval time and source URL. This does not require enabling checkout or bidding.

## How to become authorised for restricted item and listing capabilities

There are two different approvals and they should not be conflated:

1. **For richer item characteristics:** first use the Browse `getItem` method and `PRODUCT`/aspect-refinement field groups with the standard application scope. If eBay returns an authorization error for a specific method or field group, inspect the application's assigned scopes in the Developer Portal and use the scope shown in that method's documentation. Do not request a user token unless the method explicitly requires one. This is the shortest path for the item-detail work Top Cherry needs.
2. **For affiliate commissions and restricted buyer/notification capabilities:** join the [eBay Partner Network](https://partnernetwork.ebay.com/solutions/joining-the-ebay-partner-network) using the eBay account tied to the application. Complete the company, promotional-property, currency and agreement sections accurately. In the application, describe Top Cherry as a research and discovery product that sends a user to eBay; do not describe it as an eBay checkout, custody, pooled-investment or execution service.
3. Build and demonstrate the non-checkout Browse experience in Sandbox. Prepare the production submission with the live user journey, data-flow diagram, marketplaces, intended traffic, data retention/deletion controls, disclosure placement, and a clear explanation that asking prices are not transaction prices. eBay's buying-application process requires an Application Growth Check for restricted Buy APIs in production, followed by any required eBay approvals and contracts before going live.
4. For `ITEM_PRICE_REVISION` and `ITEM_AVAILABILITY`, use the Commerce Notification API's topic discovery method to see the scopes actually assigned to the keyset, then request the relevant ePN/approved-partner access through eBay. These topics are not unlocked by verifying the account-deletion callback. `ITEM_PRICE_REVISION` is documented as an eBay Partner Network notification, and `ITEM_AVAILABILITY` is also restricted by marketplace/partner eligibility.

## Operating rules to follow

Use the `itemAffiliateWebUrl` returned by eBay when sending a commission-eligible user to eBay. Clearly label the action as going to eBay and show any legally required affiliate disclosure before the user follows the link. Do not auto-redirect, hide the destination, place affiliate links inside eBay properties, alter eBay logos, use “eBay” in a confusing domain or social handle, bid on eBay as a paid-search term, or use messaging, incentive/loyalty or paid-traffic models without the relevant special-business-model approval. Keep client secrets and application tokens server-side, honour eBay data-handling, retention and deletion requirements, and keep Top Cherry's research-only AML boundary separate from eBay authorization.

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
- [eBay Browse getItem](https://developer.ebay.com/api-docs/buy/browse/resources/item/methods/getItem)
- [eBay OAuth scopes](https://developer.ebay.com/api-docs/static/oauth-scopes.html)
- [eBay Application Growth Check](https://developer.ebay.com/develop/get-started/application-growth-check)
- [eBay Partner Network joining](https://partnernetwork.ebay.com/solutions/joining-the-ebay-partner-network)
- [eBay Partner Network rules](https://partnernetwork.ebay.com/solutions/step-5-knowing-the-rules)
