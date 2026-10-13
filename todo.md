# Top Cherry — Setup and eBay market-signal rollout

## Repository setup
- [x] Replace generic package identity with Top Cherry Capital.
- [x] Add product-specific README, clone/run instructions, secret configuration names, and deployment distinctions.
- [x] Add executable `pnpm setup`, `pnpm setup:check`, and `pnpm validate` commands.
- [x] Run the real setup command: install, TypeScript, deterministic tests, backend build, and configuration check.
- [x] Add a read-only GitHub Actions validation workflow without production secrets or deployment permissions.
- [x] Separate opt-in live HTTPS verification from deterministic CI tests; check the exact challenge hash, not just its shape.
- [x] Sync the prior validated release to the private GitHub repository over the user-approved SSH identity.
- [ ] Confirm the GitHub Actions run has completed after the setup commit. The connected GitHub app currently lacks private-repository API access, so SSH verification is available but Actions status cannot yet be read through that app.

## Three follow-ups
- [ ] Enable `ITEM_AVAILABILITY` and `ITEM_PRICE_REVISION`. BLOCKED: eBay rejected `buy.item.stream` with HTTP 400 / `invalid_scope` on 13 October 2026 at 17:07 UTC. No listing subscription was created. Obtain the required eBay authorization before activation.
- [x] Prepare a verified-event pipeline with idempotent normalization, event-time ordering, and currency-matched price history. A missing baseline is unknown; an unavailable listing is not a proven sale.
- [x] Add Workspace monitoring with actual counts, last receipt, subscription states, signal aggregates, explicit unavailable/loading states, and refresh.
- [x] Keep item-level signal history authenticated; return no raw payloads or personal identifiers in public monitoring.
- [x] Keep sample opportunities separate from compliance notifications and eventual live listing observations.

## Existing foundation
- [x] Budget-sensitive pooled-capital planner, marketplace-independent categories, source/location filters, and configurable deal costs.
- [x] Three-layer market lens and action-window prototype, explicitly labelled sample signals.
- [x] Persistent eBay callback challenge, signed POST verification, cached public keys, durable idempotent event storage, and account-deletion payload redaction.

## Later work
- [ ] First real Browse API listing import and verified counts.
- [ ] Topic-specific live callback and persistence tests after listing access is granted.
- [ ] Persistent browser UI deployment separate from the webhook-only backend domain.
- [ ] Cross-platform product identity clustering and user outcome feedback.

## Important boundaries
GitHub source synchronization, CI execution, database migration, WebDev checkpointing, production deployment, and eBay authorization are different steps. Completing one does not activate the others. The current registered eBay subscription handles account deletion, not marketplace-wide listing changes. Account-deletion acknowledgement/redaction alone is not an assertion of a complete data-erasure workflow; any future retained seller/customer data must have a verified deletion process.
