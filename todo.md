# Top Cherry — Three-layer remorphing prototype

## Done
- [x] Visible layer: listing price, condition, location, source, trust, and net economics.
- [x] Behavioral layer: inventory pressure, price pressure, seller concentration, and visibility duration signals.
- [x] Network/novelty layer: novelty, propagation, demand diversity, momentum, and manipulation-risk guardrails.
- [x] Action window guidance on opportunity details.
- [x] Unit tests for signal ranges and actionability.

## Next
- [ ] Replace seeded signal values with timestamped marketplace observations.
- [ ] Add listing-event storage for first-seen, repriced, removed, and relisted events.
- [ ] Add cross-platform product identity clustering.
- [ ] Add user outcome feedback to calibrate predictions.
- [ ] Connect eBay Browse API observations to the behavioral layer.

## Known limitations
- Current signals are a transparent prototype dataset, not live measurements.
- Network momentum is an analytical indicator, not a mechanism to manufacture demand or influence prices.
