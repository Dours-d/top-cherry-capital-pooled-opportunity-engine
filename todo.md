# Top Cherry — Three-layer remorphing prototype

## Done
- [x] Visible layer: listing price, condition, location, source, trust, and net economics.
- [x] Behavioral layer: inventory pressure, price pressure, seller concentration, and visibility duration signals.
- [x] Network/novelty layer: novelty, propagation, demand diversity, momentum, and manipulation-risk guardrails.
- [x] Action window guidance on opportunity details.
- [x] Unit tests for signal ranges and actionability.
- [x] eBay HTTPS notification callback with GET challenge verification and POST acknowledgement.
- [x] Verified public callback on backend port 3000 with a live challenge hash match.
- [x] eBay notification signature decoding and ECC/SHA-256 public-key verification path.
- [x] One-hour public-key cache and application-token cache.
- [x] Durable eBay notification event table with unique notification IDs for idempotency.
- [x] Test coverage for valid signatures, tampered payloads, malformed headers, and token format.

## Next
- [ ] Connect eBay public-key lookup and verified notification processing to a production eBay subscription.
- [ ] Add listing-event storage for first-seen, repriced, removed, and relisted events.
- [ ] Add cross-platform product identity clustering.
- [ ] Add user outcome feedback to calibrate predictions.
- [ ] Connect eBay Browse API observations to the behavioral layer.
- [ ] Move the callback from the temporary sandbox URL to a persistent production HTTPS domain before relying on eBay delivery.

## Known limitations
- Current market signals are a transparent prototype dataset, not live measurements.
- The verified sandbox callback is temporary and may stop when the development server is stopped.
- The current notification route requires valid eBay application credentials to fetch the signing public key for each new key ID.
- Network momentum is an analytical indicator, not a mechanism to manufacture demand or influence prices.
