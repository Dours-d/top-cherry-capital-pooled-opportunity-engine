# Top Cherry — Transmission-first roadmap

Direction accepted on 14 October 2026, clarified as a multi-mechanism architecture in v2.1. The [core specification](docs/core-specification.md) controls future work. This roadmap supersedes the earlier listing-first feature sequence; it does not retroactively mark the redesigned engine implemented.

## R0 — Architectural reset
- [x] Record the economic-transmission premise and distinguish target product from implemented prototype.
- [x] Define the transmission thesis as the primary analytical object; make search/listings sensors and candidate channels.
- [x] Specify nodes, relationships, populations, observations, theses, candidates, capital decisions and outcomes.
- [x] Make the reusable system of relationships, exposed populations, market responses and feedback the foundation; no single driver, sector or pair of relationships defines the core. Equity/oil paths are non-exclusive reference cases. Keep conditional effects and unknown coefficients explicit for every mechanism.
- [x] Rewrite repository purpose and development priorities without changing working app behavior or secrets.
- [x] Publish the architectural decision in Notion and correct the narrow foundation wording in place for v2.1: all eight revised blocks persisted after reload; 325 unrelated blocks were preserved.

Release procedure: validate, save the documentation checkpoint, synchronize by approved SSH push, and verify the remote commit. Hosted CI remains a separate R5 verification gate.

## R1 — Relationship contracts and allocation correctness
- [/] **R1.1 Shared domain contracts:** implement `shared/transmission.ts` with validated nodes, edges, exposures, observations, theses, candidates, decisions and outcomes.
- [/] **R1.2 Extensible mechanism registry:** implement `shared/mechanism-registry.ts` with diverse mechanism families and explicit applicability, evidence and horizons.
- [/] **R1.3 Thesis evaluation:** implement `shared/evaluate-thesis.ts` with temporal integrity, missing evidence, contradictory channels, unknowns and deterministic readiness states.
- [ ] **R1.4 Versioned thesis/decision drafts:** local persistence first; cloud sync only with explicit owner-scoped API work.
- [ ] **R1.5 Embedded reasoning screens:** thesis-led Discover flow, evidence path and candidate linking.
- [ ] **R1.6 Correct planner affordability:** all-in acquisition cash, confirmed stock, integer quantity and explicit reserve.
- [ ] **R1.7 Outcomes and revision loop:** preserve decision snapshots and record later evidence without rewriting history.
- [ ] **R1.8 End-to-end acceptance:** one complete thesis-to-candidate-to-allocation-to-outcome journey.

### Current R1 slice files
- `shared/transmission.ts`
- `shared/mechanism-registry.ts`
- `shared/evaluate-thesis.ts`
- `tests/transmission.test.ts`
- `docs/r1-implementation-steps.md`

### R1.1–R1.3 exit checks
- [ ] TypeScript passes.
- [ ] Deterministic tests pass.
- [ ] A relationship from a non-equity/non-oil family can be represented and evaluated.
- [ ] Missing, future, contradictory and duplicate evidence never becomes a fabricated ready state.
- [ ] Mechanism additions do not require changing the central evaluator.

## R2 — First live transmission slice
- [ ] Select a bounded pilot by economic relevance and usable evidence, not because it fits the equity/oil examples.
- [ ] Verify eBay Browse authorization separately from the previously denied item-stream scope.
- [ ] Implement real listing ingestion with exact item URLs, coverage, provenance, normalization and deduplication.
- [ ] Collect relevant upstream observations with correct units, currencies, time definitions and vintages.
- [ ] Link observations and candidates through a documented population exposure and transmission thesis.
- [ ] Accumulate history; show absent sale evidence, insufficient history and unknown response estimates honestly.

## R3 — Response estimation and validation
- [ ] Estimate supported relationships and delays; retain limited scenarios where evidence is insufficient.
- [ ] Compare listing/economics-only and transmission-informed selection using chronological holdouts.
- [ ] Include costs, unsold/withdrawn inventory, holding time, abstentions, missing outcomes and sample coverage.
- [ ] Prevent future observations, revised data and duplicated evidence from leaking into historical decisions.
- [ ] Version models and record thesis invalidation and outcomes rather than explaining every result after the fact.

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
- [x] Budget-sensitive pooled-capital prototype, shared categories, source/country/pickup filters and configurable cost assumptions. Known cash/stock/opportunity-cost corrections are tracked in R1.6.
- [x] Three-layer sample market lens and action windows, explicitly separated from live evidence.
- [x] Signed-in saves and preferences; complete cross-device/native validation remains pending.
- [x] Persistent eBay callback challenge, signed POST verification, public-key caching, durable idempotent storage and account-deletion payload redaction.
- [x] Verified-event normalization with event-time ordering and currency-matched price history; unavailable listings are not treated as proven sales.
- [x] Workspace monitor with actual delivery counts, receipt/subscription states, signal aggregates, refresh and unavailable/loading states.
- [x] Top Cherry-specific setup, secret-safe configuration checks, credentials-free deterministic validation, backend build and opt-in live challenge check.
- [x] Read-only GitHub validation workflow without production secrets or deployment permissions; prior source release SSH-synchronized.

## External gates and boundaries
- eBay account-deletion delivery does not establish Browse search or listing-stream permissions.
- GitHub source synchronization, hosted CI, database migration, checkpoints, UI deployment and provider access are separate gates.
- No credentials, eBay destinations, subscriptions, recurring jobs, migrations or money-handling features are changed by the R1.1–R1.3 slice.
