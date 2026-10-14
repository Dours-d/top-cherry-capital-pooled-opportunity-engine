# Top Cherry — Transmission-first roadmap

Direction accepted on 14 October 2026. The [core specification v2.0](docs/core-specification.md) controls future work. This roadmap supersedes the earlier listing-first feature sequence; it does not retroactively mark the redesigned engine implemented.

## R0 — Architectural reset
- [x] Record the economic-transmission premise and distinguish target product from implemented prototype.
- [x] Define the transmission thesis as the primary analytical object; make search/listings sensors and candidate channels.
- [x] Specify nodes, relationships, populations, observations, theses, candidates, capital decisions and outcomes.
- [x] Make equity-wealth/luxury and oil-income/cost relationships foundational; keep conditional effects and unknown coefficients explicit.
- [x] Rewrite repository purpose and development priorities without changing working app behavior or secrets.
- [x] Publish the superseding architectural decision to the existing Notion page; all 79 specification segments persisted after reload and all 254 earlier blocks were preserved.

Release procedure: validate, save the documentation checkpoint, synchronize by approved SSH push, and verify the remote commit identity. Hosted CI remains a separate R5 verification gate.

## R1 — Relationship contracts and allocation correctness
- [ ] Implement shared, validated schemas for the domain records defined in the core specification.
- [ ] Encode the two reference transmission paths with exposure conditions, evidence status, time horizons and competing channels; no invented elasticities.
- [ ] Test conflicting oil channels, differently exposed buyer populations, missing data, revisions and lag handling with separate fixtures.
- [ ] Correct planner affordability to all-in acquisition cash, confirmed available stock, integer quantity and explicit reserve.
- [ ] Rename the current capital-share label; define actual opportunity cost through feasible alternatives and holding time.
- [ ] Keep general-mechanism evidence, estimated market response and executable-deal feasibility separate.

Exit gate: inspectable theses and evidence without fabricated inputs; allocations cannot exceed cash or stock.

## R2 — First live transmission slice
- [ ] Select one bounded product family and buyer market according to available evidence and usable provider access.
- [ ] Verify eBay Browse authorization separately from the previously denied item-stream scope.
- [ ] Implement real listing ingestion with exact item URLs, coverage, provenance, normalization and deduplication.
- [ ] Collect the relevant upstream economic observations with correct units, currencies, time definitions and vintages.
- [ ] Link observations and candidates through a documented population exposure and transmission thesis.
- [ ] Accumulate history; show absent sale evidence, insufficient history and unknown response estimates honestly.

Exit gate: a real driver-to-population-to-market-to-candidate path is inspectable. This is not yet a claim of predictive success.

## R3 — Response estimation and validation
- [ ] Estimate supported relationships and delays; retain limited scenarios where evidence is insufficient.
- [ ] Compare listing/economics-only and transmission-informed selection using chronological holdouts.
- [ ] Include costs, unsold/withdrawn inventory, holding time, abstentions, missing outcomes and sample coverage.
- [ ] Prevent future observations, revised data and duplicated evidence from leaking into historical decisions.
- [ ] Version models and record thesis invalidation and outcomes rather than explaining every result after the fact.

Exit gate: documented response evidence and outcome tracking; usefulness must be demonstrated against a simpler baseline.

## R4 — Broader system and network feedback
- [ ] Extend economic paths, regions and product families without treating national averages as individual behavior.
- [ ] Add cross-platform product identity and search-coverage comparability.
- [ ] Measure adoption and direct/indirect network effects separately from virality and paid visibility.
- [ ] Use outcomes to refine relationship assumptions and shared-exposure limits.
- [ ] Enable listing-change subscriptions only when provider permission is granted; they improve observation frequency but do not define the product.

## R5 — Operational readiness
- [ ] Deploy and verify persistent user-facing access separately from the working webhook domain.
- [ ] Test native/browser account, saved-deal and planning flows end to end.
- [ ] Implement and verify alert dispatch, deduplication and operational execution in a supported environment.
- [ ] Verify personal-data retention/erasure, not merely deletion-notification acknowledgement/redaction.
- [ ] Confirm hosted GitHub Actions status; SSH synchronization is not proof of a passing Actions run.
- [ ] Define contributor commitments, ownership and auditable accounting if actual multi-contributor pooling is intended; no money collection is currently implemented.

## Retained foundation — implemented prototype, not the new engine
- [x] Budget-sensitive pooled-capital prototype, shared categories, source/country/pickup filters and configurable cost assumptions. Known cash/stock/opportunity-cost corrections are tracked in R1.
- [x] Three-layer sample market lens and action windows, explicitly separated from live evidence.
- [x] Signed-in saves and preferences; complete cross-device/native validation remains pending.
- [x] Persistent eBay callback challenge, signed POST verification, public-key caching, durable idempotent storage and account-deletion payload redaction.
- [x] Verified-event normalization with event-time ordering and currency-matched price history; unavailable listings are not treated as proven sales.
- [x] Workspace monitor with actual delivery counts, receipt/subscription states, signal aggregates, refresh and unavailable/loading states.
- [x] Item history requires sign-in; public monitoring exposes no raw payloads or personal identifiers.
- [x] Top Cherry-specific setup, secret-safe configuration checks, credentials-free deterministic validation, backend build and opt-in live challenge check.
- [x] Read-only GitHub validation workflow without production secrets or deployment permissions; prior source release SSH-synchronized.

## External gates and boundaries
On 13 October 2026, eBay rejected `buy.item.stream` with HTTP 400 / `invalid_scope`; no listing subscription was created. `ITEM_AVAILABILITY` and `ITEM_PRICE_REVISION` activation remains blocked pending authorization. This does not establish whether Browse search is authorized; check it independently.

The active eBay subscription is account deletion, not a marketplace-wide inventory feed. Successful compliance notifications do not establish inventory coverage, market predictions or complete personal-data erasure.

GitHub source synchronization, hosted CI, database migration, checkpoints, UI deployment and provider access are separate gates. Existing GitHub API/app access remains unavailable; approved SSH pushes work. This redesign does not depend on resolving that connector first.

No credentials, eBay destinations, subscriptions, recurring jobs, migrations or money-handling features are changed by the documentation release.
