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
- [x] R1.7o Operator context: reviewers can add an optional note when clearing a follow-up; notes are stored with the acknowledgment and labeled as context, not market evidence.
- [x] R1.7p Queue filters: Workspace separates active, due/overdue, and reviewed acknowledgments locally without changing the underlying evidence or allocation gates.
- [x] R1.7q Authenticated review ledger foundation: user-scoped observation-review storage, protected tRPC list/upsert procedures, additive migration, and local-to-server upsert wiring are in place; anonymous users retain local fallback.
- [x] R1.8b Review reconciliation acceptance: local and remote acknowledgments normalize, merge idempotently by review ID, prefer the latest review context, and remain structurally unable to create valuation fields.
- [x] R1.8c Outcome sync foundation: user-scoped listing-outcome storage, protected tRPC list/upsert procedures, additive migration, local/server merge wiring, and evidence-only acceptance coverage are in place; outcomes still do not write valuation or allocation fields.
- [x] R1.8d Outcome sync resilience: authenticated outcome writes expose syncing/failed states, retain the device copy on failure, and provide an explicit retry action; no silent conversion to market evidence occurs.
- [x] R1.8e Workspace outcome history: authenticated server outcomes reconcile into a bounded review panel alongside local observations, with explicit evidence-only wording and no valuation or allocation interpretation.
- [x] R1.8f Durable outcome retry queue: failed authenticated writes persist locally across app restarts; Workspace reports the pending-sync count while the device remains the source of truth until retry succeeds.
- [x] R1.8g Workspace retry-all: authenticated users can replay all durable pending outcome writes sequentially; only records confirmed by the server are removed from the queue, while failures remain visible.
- [x] R1.8h Auth-restored retry: Workspace performs one bounded automatic retry pass when authentication becomes available and pending evidence writes exist; remaining failures stay queued without a background retry loop.
- [x] R1.8i Retry diagnostics: each durable pending outcome records its last attempt time and the latest sync failure reason, displayed per record in Workspace without changing the underlying evidence semantics.
- [x] R1.8j Audited dismissal: a failed pending outcome can be cleared only after entering a required local audit note; the dismissal record is stored separately from outcome evidence and does not imply successful synchronization.
- [x] R1.8k Dismissal history: Workspace visibly lists recent intentionally cleared sync records with outcome ID, timestamp and audit note, clearly distinct from synchronized outcomes.
- [x] R1.8l Outcome status filters: Workspace can filter All, Pending, Synced, and Dismissed records; retry and clear controls appear only in the relevant status view.
- [x] R1.8m Audited restoration: dismissed records can return to the pending queue only with a required restore note; original dismissal and restoration timestamps/notes remain visible and no server write is implied.
- [x] R1.8n Queue transition hardening: dismissal and restoration rules are pure shared helpers with regression coverage for required notes, duplicate prevention, preserved audit context, and retry-required state.
- [x] R1.8o Account-scoped audit history: dismissal/restoration events have an additive user-scoped table, protected list/upsert procedures, deterministic local/remote merge, and visible Workspace sync status; anonymous users retain local fallback.
- [x] R1.8p Audit-sync resilience: failed dismissal/restoration audit writes persist locally with attempt time and error context, retry sequentially from Workspace, clear only after server confirmation, and receive one bounded retry pass after authentication restoration.
- [x] R1.8 End-to-end acceptance: the acceptance suite now covers raw-row to candidate clustering, observed outcomes, allocation gating, review reconciliation, evidence-only outcome merge, audited dismissal/restoration, durable audit retry failure, server-confirmed cleanup, and restored audit history without valuation or execution side effects.

## Later phases — paused
R2 full real-data ingestion, R3 response estimation, R4 network feedback and R5 operational readiness remain gated. The eBay Browse application-token path is verified server-side and surfaced in Discover as a public, bounded read-only asking-price feed, but it is not yet reconciled into the persistent listing store or a recurring collector.
- [x] R2.0a Bounded reconciliation screen: a dedicated mobile view records the provider, marketplace, query, fetch timestamp, raw rows, provisional candidate clusters, seller-identity availability, pagination and per-row asking-price provenance; no valuation, stock confirmation, outcome inference or allocation action is exposed.
- [x] R2.0b Normalized snapshot persistence: authenticated users can save the current eBay Browse page as user-scoped normalized observation rows with idempotent snapshot keys, source provenance, asking price/currency, seller/location when available, source fetch time and explicit `observed` reconciliation status; no market-value or allocation fields are stored.
- [x] R2.0c Snapshot review queue: Workspace lists authenticated persisted observations with observed/reviewed/superseded filters; changing status requires a note and reviewer timestamp, and the UI states that review is evidence curation only—not stock, valuation, outcome or allocation approval.
- [x] R2.0d Cross-fetch comparison: Workspace compares the same provider listing against earlier persisted observations only when currency matches, reports unchanged/increased/decreased/unknown state, and labels movement as asking-price evidence rather than a sale or market-value signal.
- [x] R2.0e Observation aging: persisted source observations display fresh/aging/stale/unknown quality prompts from source fetch time using coarse 24-hour/7-day thresholds; age never infers availability, sale, stock or value.
- [x] R2.0f Listing history view: Workspace snapshot rows open a focused history screen for one provider listing, showing every persisted fetch, review status, currency-matched movement, freshness and provenance; the screen remains evidence-only and has no allocation or valuation action.
- [x] R2.0g Bulk snapshot review: the visible observed set can be marked reviewed sequentially with one required shared note; the UI waits for server confirmation per row and leaves the note/review state intact if a write fails.
- [x] R2.0h Marketplace freshness thresholds: Workspace stores bounded freshness presets per marketplace and uses them only for fresh/aging/stale data-quality prompts.
- [x] R2.0i Provider reconciliation rules: eBay and fallback providers distinguish required identity/price/timestamp fields from recommended enrichment; Workspace shows ready/needs-attention prompts without creating valuation or stock evidence.
- [x] R2.0j History parity: the focused per-listing history screen reuses the same provider-quality evaluator, shows required-field attention counts and recommended enrichment prompts, and keeps them separate from movement, freshness, sale, stock and valuation interpretation.
- [x] R2.0k eBay item-detail coverage: Discover classifies the item-detail response as unavailable, partial, or present based on core response fields and seller-provided aspects; characteristic presence is explicitly non-blocking and non-valuational.
- [x] R2.0l Profile-aware characteristics: eBay detail views recommend market-specific seller fields for watches, cameras, cars, audio, instruments and jewellery; missing recommendations remain non-blocking research prompts.
- [x] R2.0m History parity: persisted listing-history routes carry stored profile context and repeat the same market-specific characteristic prompts, while explicitly treating absent profile context as unknown rather than guessing.
- [x] R2.0n Reconciliation guidance: the R2 screen and each normalized provider row surface profile-specific characteristic prompts before snapshot persistence; prompts remain separate from required provenance fields and do not affect storage, valuation or allocation.
- [x] R2.0o Audited characteristic acknowledgment: persisted snapshots now have a separate `characteristicsChecked` flag, timestamp and required note, with protected user-scoped transition API and Workspace/history display; it does not change snapshot status or imply provider verification.
- [x] R2.0p Bulk characteristic acknowledgment: Workspace can sequentially acknowledge only unchecked visible snapshots with one required note, waiting for server confirmation and preserving independent snapshot review status.
- [x] R2.0q On-demand item detail: each normalized eBay row can fetch the provider item-detail response and show seller-provided localized aspects, coverage state, fetch time and item ID; unavailable details remain unknown and the panel carries no valuation, authenticity, stock or allocation meaning.
- [x] R2.0r Immutable characteristic audit timeline: each authenticated check appends a user-scoped `checked` or `rechecked` event with stable audit ID, timestamp and required note; focused listing history displays all events without overwriting prior context.

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
