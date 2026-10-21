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
- [x] R1.6 Plan uses all-in acquisition cash, an explicit user-editable cash reserve, confirmed-stock limits, and an explicit local reservation state; legacy quantities are reconciled out unless both prerequisites are present.
- [x] R1.6b Discover live asking-price toggle: public, read-only eBay Browse results are surfaced by profile; currency is preserved and market value, margin, score and history remain explicitly unknown.
- [x] R1.6c Live Browse controls and detail path: refresh and offset pagination are available; opening a live item requests seller-provided `localizedAspects` through Browse `getItem` with `PRODUCT`, without enabling checkout, bidding or user tokens.
- [x] R1.6d Affiliate destination boundary: preserve eBay `itemAffiliateWebUrl` when supplied and require an explicit outbound disclosure before opening live eBay listings.
- [x] R1.6e Workspace provider-gate tracker: persistent local checklist for Browse verification, EPN onboarding, Application Growth Check preparation and restricted notification-topic requests; checklist completion never represents eBay approval.
- [x] R1.6f Asking-price decision gate: live records explicitly remain observe-only; Discover states the leverage of asking prices and lists the independent evidence required before considering one unit for allocation.
- [x] R1.6g User-defined price test: live detail accepts an independent exit benchmark and minimum net buffer, then calculates a maximum acceptable ask after estimated shipping, fees and travel; it does not label the benchmark as market value.
- [ ] R1.7 Outcomes and revision loop.
- [x] R1.7a Local outcome ledger: live listing details can record observed sale, price revision, expiry/removal, or unavailability with optional realized price and notes; observations are research evidence only and do not infer a sale from disappearance.
- [x] R1.7b Redundancy-aware live counts: Discover separates raw asking-price rows from candidate item clusters and flags apparent duplicate/relisted/cross-posted supply; clustering is a heuristic and does not confirm physical stock.
- [x] R1.7c Seller concentration boundary: live feed reports seller concentration only when explicit seller IDs are present; current eBay summary normalization keeps seller identity unavailable rather than inferring coordination from titles or prices.
- [x] R1.7d Seller identity propagation: preserve eBay Browse seller usernames when supplied, enabling verified seller concentration analysis without changing the unknown state when the provider omits the field.
- [x] R1.7e Confidence-aware identity clustering: candidate keys now combine normalized model/condition with seller and location when available; same-model rows from different sellers are not merged, and cluster confidence remains provisional.
- [x] R1.7f Outcome quality summary: observed outcomes are summarized by evidence quality and ask-to-observed-price movement; expiry/removal remains partial evidence and never becomes a sale automatically.
- [x] R1.8a Acceptance extension: regression coverage now traverses provisional identity clustering, observed outcome evidence, and the existing thesis/candidate/budget allocation gate.
- [x] R1.7g Local re-observation cadence: outcome records can schedule a persisted 24-hour follow-up timestamp; this is an in-app research reminder, not a server-side collector or unattended provider job.
- [x] R1.7h Follow-up state: scheduled, due-now, and overdue states are explicit in the outcome ledger; the UI asks the operator to refresh and record evidence rather than implying an automatic fetch.
- [x] R1.7i Workspace follow-up queue: persisted local schedules and outcome records are summarized in one review panel, with due counts, listing IDs, latest outcome context, and an explicit no-fetch disclaimer.
- [x] R1.7j Follow-up navigation: queue rows open Discover with a listing focus target; matching current Browse rows open automatically, while unavailable rows produce an explicit no-replacement explanation.
- [x] R1.7k Follow-up context and recovery: schedules preserve listing title, marketplace, asking price and currency when available; Discover offers a direct next-page action for an absent focus target while keeping the no-substitution rule.
- [x] R1.7l Item-specific recovery: queued listing titles travel into Discover and expose a direct search action when pagination does not locate the original listing; no alternate item is treated as a match.
- [x] R1.7m Review acknowledgment: Workspace follow-up rows can be marked reviewed, which clears only the local reminder and explicitly does not imply a fetch, sale, price change, or other outcome.
- [x] R1.7n Review audit context: acknowledgments persist a local UTC timestamp and a compact recent-history view; outcome records remain separate and unchanged.
- [ ] R1.8 End-to-end acceptance.

## Later phases — paused
R2 full real-data ingestion, R3 response estimation, R4 network feedback and R5 operational readiness remain gated. The eBay Browse application-token path is verified server-side and surfaced in Discover as a public, bounded read-only asking-price feed, but it is not yet reconciled into the persistent listing store or a recurring collector.

## Existing boundaries
- eBay account-deletion delivery does not establish Browse search or listing-stream permissions.
- GitHub source synchronization, hosted CI, database migration, checkpoints, UI deployment and provider access are separate gates.
- Current three-layer signals are sample evidence views, not live predictive evidence.
- eBay Browse production access was verified read-only on 19 October 2026: application token minted successfully and `EBAY_GB` search returned live item summaries. Browse returns asking price and listing metadata; it does not by itself establish market value, realized resale price or listing-event history.
- No credentials, eBay destinations, subscriptions, recurring jobs or money-handling features are changed by the AML-0 pause. The authenticated thesis-draft migration is research-workspace infrastructure only and does not collect funds or execute trades.

## Next artifact
See `top-cherry-market-fit-aml-phase-assessment-2026-10-15.md` for the market-fit questions, operating-model options, AML risk register and go/no-go criteria. The next engineering artifact is a bounded eBay Browse reconciliation screen with provenance and no inferred market value. Partner Network, Application Growth Check and notification-topic approval remain separate provider gates; richer item aspects use the standard Browse item-detail path where the seller supplies them.

## Research artifact completed
- [x] `docs/economic-context-source-inventory.md`: 12-domain source baseline covering drivers, populations, market structure, responses, eligibility constraints, vintages, proxies, and coverage gaps.
