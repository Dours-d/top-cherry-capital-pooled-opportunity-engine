# Top Cherry — Three-layer remorphing prototype

## Done
- [x] Visible layer: listing price, condition, location, source, trust, and net economics.
- [x] Behavioral layer: inventory pressure, price pressure, seller concentration, and visibility duration signals.
- [x] Network/novelty layer: novelty, propagation, demand diversity, momentum, and manipulation-risk guardrails.
- [x] Action window guidance on opportunity details.
- [x] eBay HTTPS callback with challenge verification and signed POST validation.
- [x] Persistent Manus HTTPS endpoint configured in the enabled eBay destination.
- [x] Persistent challenge verification passed.
- [x] eBay test notification delivered successfully after the verifier fix.
- [x] 15 verified eBay notification records persisted; duplicate delivery remains idempotent.
- [x] Normalized listing-event storage for item availability, price, and marketplace changes.
- [x] Privacy-safe persistence for Marketplace Account Deletion payloads; personal identifiers are not retained.
- [x] Signature verification supports SHA-256 and SHA-1 compatibility paths used by eBay SDK variants.
- [x] PEM normalization prevents OpenSSL decoder failures on compact eBay public-key responses.

## Pending
- [ ] Confirm listing-event records when a listing-specific eBay topic is enabled.
- [ ] Add cross-platform product identity clustering.
- [ ] Add user outcome feedback to calibrate predictions.
- [ ] Connect eBay Browse API observations to the behavioral layer.

## Known limitations
- Current market signals are a transparent prototype dataset, not live measurements.
- The current eBay subscription is Marketplace Account Deletion, so the listing-event table is empty until listing-related topics are subscribed.
- Network momentum is an analytical indicator, not a mechanism to manufacture demand or influence prices.
