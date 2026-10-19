# Top Cherry — Transmission-first roadmap

**Current gate:** AML-0 / market-fit assessment still governs operational expansion. Research infrastructure may advance, but no money-handling or automated market operation is enabled.

Direction accepted on 14 October 2026, clarified as a multi-mechanism architecture in v2.1. The [core specification](docs/core-specification.md) controls future work. The product is currently a listing-and-allocation prototype with a transmission-contract slice; it is not a pooled investment service.

## R0 — Architectural reset
- [x] Record the economic-transmission premise and distinguish target product from implemented prototype.
- [x] Define the transmission thesis as the primary analytical object; make search/listings sensors and candidate channels.
- [x] Specify nodes, relationships, populations, observations, theses, candidates, capital decisions and outcomes.
- [x] Make the reusable system of relationships, exposed populations, market responses and feedback the foundation; no single driver, sector or pair of relationships defines the core.
- [x] Rewrite repository purpose and development priorities without changing working app behavior or secrets.
- [x] Publish the architectural decision in Notion and correct the narrow foundation wording in place.

## AML-0 — Market-fit and operating-model gate
- [ ] Freeze the research-only product boundary: no money collection, custody, execution, pooled returns or individualized financial-instrument recommendations.
- [ ] Interview distinct cohorts and test willingness to pay for one narrow research outcome.
- [ ] Compare research-only, referral, coordinated physical purchasing, pooled ownership and execution/custody models.
- [ ] Draw end-to-end funds and asset flows for each model.
- [ ] Obtain specialist UK/EU perimeter advice before opening any pooling, custody, execution, financial-promotion or investor-onboarding path.
- [ ] Define expansion triggers, ownership, jurisdiction, AML/KYC responsibility and escalation rules.

**AML-0 exit gate:** a specific user segment has a repeated problem and measurable value; the selected model has a documented asset/funds flow; no hidden custody or execution exists; and specialist review has cleared the next operating boundary.

## R1 — Paused pending AML-0
- [x] R1.1 Shared domain contracts implemented and tested.
- [x] R1.2 Extensible mechanism registry implemented and tested.
- [x] R1.3 Deterministic thesis evaluator implemented and tested.
- [x] R1.4 Versioned thesis/decision drafts: immutable revisions, parent lineage, and explicit status transitions implemented in `shared/versioned-drafts.ts` with regression coverage.
- [ ] R1.5 Embedded reasoning screens.
  - [x] R1.5a Read-only thesis path and evidence detail integrated into Discover listing details; sample-only status is explicit.
  - [x] R1.5b Local thesis draft editor with immutable revisions, explicit draft/submitted/archived transitions, and local persistence.
  - [x] R1.5c Evidence attach/remove and source inspection actions; readiness is re-evaluated from the current draft evidence set.
  - [x] R1.5d Candidate-to-Plan linkage with separate thesis-readiness and purchase-feasibility states; linked candidates are highlighted without bypassing Plan budget rules.
  - [x] R1.5e Revision history inspection and restore-as-new-revision; prior history is never overwritten.
  - [x] R1.5f Explicit contradiction/unknown and invalidation-condition editing; submission is blocked when review safeguards are not satisfied.
  - [x] R1.5g Structured contradiction entry with description, source, severity, immutable serialization, and blocking evaluator semantics.
  - [x] R1.5h Contradiction resolution controls; open/resolved state is parsed by the evaluator and resolved evidence remains visible without blocking readiness.
  - [x] R1.5i Authenticated thesis revision sync contract, user-scoped database storage, migration, and protected tRPC list/upsert procedures; anonymous users retain local storage.
  - [x] R1.5j Acceptance regression for open versus resolved contradiction evidence.
  - [x] R1.5k Server-to-device reconciliation with merge-on-newer behavior and explicit same-revision conflict state.
  - [x] R1.5l Reviewer identity and resolution timestamp metadata are retained in structured contradiction markers.
  - [x] R1.5m End-to-end acceptance gate now covers thesis readiness, candidate verification/protection, net upside, reserve, budget, and Plan handoff.
- [x] R1.6 Partial: Plan now uses all-in acquisition cash and an explicit user-editable reserve; confirmed-stock and reservation semantics remain pending.
- [ ] R1.7 Outcomes and revision loop.
- [ ] R1.8 End-to-end acceptance.

## Later phases — paused
R2 full real-data ingestion, R3 response estimation, R4 network feedback and R5 operational readiness remain gated. The eBay Browse application-token path is verified server-side and exposed as a protected read-only search procedure, but it is not yet reconciled into the mobile listing store or a recurring collector.

## Existing boundaries
- eBay account-deletion delivery does not establish Browse search or listing-stream permissions.
- GitHub source synchronization, hosted CI, database migration, checkpoints, UI deployment and provider access are separate gates.
- Current three-layer signals are sample evidence views, not live predictive evidence.
- eBay Browse production access was verified read-only on 19 October 2026: application token minted successfully and `EBAY_GB` search returned live item summaries. Browse returns asking price and listing metadata; it does not by itself establish market value, realized resale price or listing-event history.
- No credentials, eBay destinations, subscriptions, recurring jobs or money-handling features are changed by the AML-0 pause. The authenticated thesis-draft migration is research-workspace infrastructure only and does not collect funds or execute trades.

## Next artifact
See `top-cherry-market-fit-aml-phase-assessment-2026-10-15.md` for the market-fit questions, operating-model options, AML risk register and go/no-go criteria. The next engineering artifact is a bounded eBay Browse reconciliation screen with provenance and no inferred market value.

## Research artifact completed
- [x] `docs/economic-context-source-inventory.md`: 12-domain source baseline covering drivers, populations, market structure, responses, eligibility constraints, vintages, proxies, and coverage gaps.
