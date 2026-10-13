# Top Cherry — Three-layer remorphing prototype

## Done
- [x] Visible layer: listing price, condition, location, source, trust, and net economics.
- [x] Behavioral layer: inventory pressure, price pressure, seller concentration, and visibility duration signals.
- [x] Network/novelty layer: novelty, propagation, demand diversity, momentum, and manipulation-risk guardrails.
- [x] Action window guidance on opportunity details.
- [x] eBay HTTPS callback with challenge verification and signed POST validation.
- [x] One-hour eBay public-key cache and application-token cache.
- [x] Durable eBay notification storage with unique notification IDs.
- [x] Normalized listing-event storage for item availability, price, and marketplace fields.
- [x] Privacy-safe persistence for Marketplace Account Deletion notifications; personal identifiers are not retained.
- [x] PEM normalization to avoid OpenSSL decoder failures on compact eBay public-key responses.
- [x] Official eBay subscription test requested twice; both requests returned HTTP 202.
- [x] Challenge endpoint rechecked publicly on backend port 3000 with HTTP 200.

## Pending
- [ ] Confirm receipt of the queued eBay test notification. The eBay API accepted both test requests, but no callback request has reached the temporary sandbox yet; the database remains at zero notification and listing events.
- [ ] Move the callback from the temporary sandbox URL to a persistent production HTTPS domain before relying on eBay delivery.
- [ ] Add cross-platform product identity clustering.
- [ ] Add user outcome feedback to calibrate predictions.
- [ ] Connect eBay Browse API observations to the behavioral layer.

## Known limitations
- Current market signals are a transparent prototype dataset, not live measurements.
- The callback is currently hosted by the temporary WebDev sandbox and may stop when the development server stops.
- The eBay subscription destination is enabled and points to the port-3000 callback, but sandbox delivery is not yet observed.
- Network momentum is an analytical indicator, not a mechanism to manufacture demand or influence prices.
