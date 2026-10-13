# Top Cherry — Three-layer remorphing prototype

## Done
- [x] Visible layer: listing price, condition, location, source, trust, and net economics.
- [x] Behavioral layer: inventory pressure, price pressure, seller concentration, and visibility duration signals.
- [x] Network/novelty layer: novelty, propagation, demand diversity, momentum, and manipulation-risk guardrails.
- [x] Action window guidance on opportunity details.
- [x] Unit tests for signal ranges and actionability.
- [x] eBay HTTPS notification callback with GET challenge verification and POST acknowledgement.
- [x] Verified public callback on backend port 3000 with a live challenge hash match.

## Next
- [ ] Replace seeded signal values with timestamped marketplace observations.
- [ ] Add listing-event storage for first-seen, repriced, removed, and relisted events.
- [ ] Add cross-platform product identity clustering.
- [ ] Add user outcome feedback to calibrate predictions.
- [ ] Connect eBay Browse API observations to the behavioral layer.
- [ ] Move the callback from the temporary sandbox URL to a persistent production HTTPS domain before relying on eBay delivery.

## Known limitations
- Current market signals are a transparent prototype dataset, not live measurements.
- The verified sandbox callback is temporary and may stop when the development server is stopped.
- The current notification route acknowledges POST payloads; signature validation and durable event storage are the next hardening steps.
- Network momentum is an analytical indicator, not a mechanism to manufacture demand or influence prices.
