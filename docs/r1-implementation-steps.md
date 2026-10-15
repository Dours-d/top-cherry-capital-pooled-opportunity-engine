# R1 — Embedded implementation steps

**Date:** 14 October 2026  
**Authority:** [Core specification v2.1](core-specification.md)  
**Status:** Planned work, not implemented functionality. All R1 implementation tasks below remain open. This document turns the accepted reasoning architecture into buildable steps; it does not enable providers or change application behavior.

## The complete user journey

Create or inspect a change → identify exposed participants → connect applicable mechanisms → inspect expected and observed responses → link a candidate → check its economics and quantity → compare capital uses → save the decision → record later evidence.

The same journey must support macroeconomic, market-local, structural and network mechanisms. Equity and oil are optional reference cases, not required input fields. The visible, behavioral and novelty/network layers are evidence views of this journey, not separate score generators.

## Dependencies and short iterations

| Step | Deliverable | Depends on | User-visible result |
| --- | --- | --- | --- |
| R1.1 | Shared domain contracts | Specification v2.1 | Consistent meanings for evidence, uncertainty, amounts and statuses |
| R1.2 | Extensible mechanism registry | R1.1 | Inspectable relationships across different driver families |
| R1.3 | Thesis evaluation and explanation | R1.1–R1.2 | Traceable reasoning with alternatives and invalidation conditions |
| R1.4 | Saved thesis/decision drafts | R1.1, R1.3 | Reloadable work without mixing demonstrations and real observations |
| R1.5 | Embedded reasoning screens | R1.3–R1.4 | Discover → thesis → evidence → candidate flow |
| R1.6 | Correct constrained allocation | R1.1; R1.3 for thesis linkage | Budget, reserve, stock and costs consistently constrain quantity |
| R1.7 | Outcome and revision loop | R1.4–R1.6 | Later evidence can challenge the original decision |
| R1.8 | End-to-end acceptance | R1.1–R1.7 | One working journey and explicit readiness for a real-data pilot |

Build R1.1–R1.3 as the first short iteration. Allocation corrections in R1.6 can then proceed alongside persistence and UI work, using the same money/quantity contracts. Deliver each usable slice with tests and an explicit status rather than treating a saved document or screenshot as an implemented feature.

## R1.1 — Define the shared contracts

### Embedded tasks

Define `EconomicNode`, `TransmissionEdge`, `PopulationExposure`, `Observation`, `Thesis`, `Candidate`, `CapitalDecision` and `Outcome` in a proposed `shared/transmission.ts`, with Zod validation and shared TypeScript types. Node and relationship identities must not be tied to a specific provider or driver family.

Separate **source provenance**—provider, manual entry or demonstration—from **evidence interpretation**—observation, supported mechanism, hypothesis or scenario. A manual entry is not verified merely because a user saved it. Demonstration records must never become live evidence through an import or reload.

Every observation carries units, currency where applicable, scope/coverage, event or measurement time, availability/publication time and ingestion time. Revisions remain identifiable. A missing value is unknown, not zero; money uses explicit currency and validated integer minor units with the correct currency scale. No comparison combines currencies without a dated conversion basis.

Keep thesis status, evidence coverage and deal feasibility separate. A well-explained thesis can be monitoring while its candidate is not ready. Unknown coefficients and exposure links remain explicit.

### Acceptance

Validation rejects invalid amounts, broken references and impossible quantity values. A local substitution thesis can be represented without equity or oil fields. Future or revised observations cannot silently appear in an earlier decision snapshot.

## R1.2 — Build an open mechanism registry

### Embedded tasks

Use a proposed `shared/mechanism-registry.ts` to describe relationships through the common contracts: affected nodes/populations, applicability conditions, mechanism, expected direction under those conditions, lag/horizon, evidence references and competing channels.

Start with diverse **test cases**, not a universal predictor list: wealth-to-discretionary-demand, replacement supply, substitution/obsolescence, platform visibility and complementary-service adoption. Fixtures are demonstrations and do not assert present market conditions. Additional mechanisms should register as validated data rather than require another branch in the central evaluator.

Distinguish a new relationship from a genuinely new computation. Registering a relationship should not require an engine rewrite; adding a new mathematical estimator may require a tested extension. Never pretend arbitrary free text executes safely as a model.

### Acceptance

An unseen relationship family can be added and inspected using the same schema. Irrelevant mechanisms stay inactive. Conflicting channels are preserved rather than collapsed into an unsupported direction. No reference fixture is mandatory for all theses.

## R1.3 — Evaluate evidence and produce inspectable theses

### Embedded tasks

Implement a proposed pure `shared/evaluate-thesis.ts`. It accepts a versioned thesis, observations and an as-of time, then returns the path, applicable/missing exposures, supporting and contradictory evidence, competing explanations, invalidation conditions and readiness reasons.

The R1 evaluator checks consistency and evidence coverage; it does **not** claim to estimate a luxury-price elasticity or forecast profits. A qualitative mechanism and an explicit scenario may be displayed when a calibrated numerical response is unavailable.

Use explicit path references with bounded traversal. Prevent cycles, repeated observations or overlapping sources from being counted as independent corroboration. An anomaly is not proof of manipulation; listing disappearance is not proof of sale; attention is not proof of network value.

### Acceptance

Removing a required observation produces an identifiable gap, not an invented default. Contradictory evidence remains visible. The same stored inputs and evaluator version produce the same explanation. A newly learned relationship can revise a thesis without rewriting its historical decision.

## R1.4 — Save drafts and preserve version history

### Embedded tasks

For the first functional slice, use a proposed `lib/thesis-storage.ts` with versioned AsyncStorage records. Make hydration, save failures and invalid stored data explicit. Do not overwrite completed decisions with later edits; store the decision-time snapshot and subsequent revisions separately.

Anonymous work stays local. Reuse existing account flows if cloud synchronization is introduced, with owner-scoped protected tRPC operations and server-side validation. That extension would touch `server/routers.ts`, `server/db.ts` and `drizzle/schema.ts`, require a reviewed migration, and is not implied by a local save indicator. Keep existing saved-listing and notification storage intact.

### Acceptance

Create → save → reload retains the thesis and its provenance. Editing does not mutate an earlier decision snapshot. A failed write is not labelled saved. Any future cloud path must reject another user's records and clearly distinguish local from synced state.

## R1.5 — Embed the reasoning into the mobile experience

### Embedded tasks

Add proposed reusable components `components/transmission-path.tsx` and `components/thesis-evidence.tsx`; integrate them into `app/(tabs)/index.tsx` with a dedicated thesis detail route if needed.

Discover shows active theses and their states before linked candidates. A compact card answers what changed, who is exposed and what response is being examined. The detail view expands each relationship and its evidence, alternatives, horizons and invalidation conditions. A listing-first entry point must also allow the user to inspect a candidate's thesis.

Provide actions to create/edit a draft, inspect sources, attach an observation, link a candidate, save and send a feasible candidate to Plan. Make the source type visible. Display unknowns and contradictions where they affect the decision, not solely in a footer. Keep legacy sample cards clearly separate; do not silently reinterpret sample scores or timing labels as engine output.

### Acceptance

The whole path is navigable at a phone viewport without hidden controls or dead buttons. Empty, loading, invalid, local-only and unavailable states are usable. Opening a demonstration thesis never suggests that live collection or predictive validation has occurred.

## R1.6 — Correct capital, quantity and alternative-use logic

### Embedded tasks

Extract a proposed shared `shared/allocation-economics.ts` and update `lib/market-data.ts` plus `app/(tabs)/plan.tsx` to use it consistently. The current planner counts asking prices as deployed capital, caps the optimizer at four units without stock evidence, and can use different economics when recalculating. Replace those behaviors rather than layering new copy over them.

Separate upfront acquisition costs from later sale/holding costs. Record when a cost is per-unit versus per-order or per-trip so quantity does not multiply fixed costs incorrectly. Compare in the pool currency only when the conversion basis is present. Unknown relevant costs, currency or live quantity prevent readiness; a labelled simulation can use explicit user assumptions without representing them as verified stock.

Enforce available cash after reserve, integer quantity, confirmed stock and user-defined concentration/exposure limits. Share the calculation among suggested mixes, plus/minus controls, summaries, budget changes and Recalculate. Revalidate saved plans when costs or stock change. Preserve valid zero budgets, handle malformed storage, avoid hydration/write races, and show losses or overcommitment instead of clamping the display to a favorable value.

Replace exhaustive cartesian enumeration with a bounded allocation approach suitable for the mobile runtime. Enforce all constraints regardless of optimization quality; label a heuristic as such and do not claim it is globally optimal. Do not use a fabricated score to manufacture an objective when exit evidence is missing.

Rename the existing percentage to **capital share**. Present opportunity cost as an alternative-use comparison only when a comparable alternative and horizon are specified; otherwise display not estimated. Offer retain-cash and manual alternatives without inventing cash returns. Quantities must not imply unlimited buyer depth or a linear exit value where that assumption is unsupported.

### Acceptance

No manual or suggested plan breaches cash, reserve or stock. Unknown currency conversion cannot become a USD estimate. Recalculate agrees with current settings. Fixed costs are counted once. A zero budget remains zero after reload. Negative scenarios stay negative. Larger capital expands feasible choices without forcing extra quantities or full deployment.

## R1.7 — Embed outcomes and revise the reasoning

### Embedded tasks

Add a proposed outcome-entry component and shared snapshot/history helpers. Record action taken or avoided, actual costs/proceeds when known, quantity still held, elapsed time and later observations. Keep missing outcomes, unsold inventory and abandoned candidates visible.

Let the user mark a thesis supported, contradicted, expired or still monitoring with an evidence-linked reason. A successful resale alone does not prove the proposed causal mechanism. Preserve original assumptions and version references, then create a new revision for changed beliefs.

### Acceptance

A later contradiction is visible beside the original thesis without editing away its original prediction. A listing withdrawal does not count as realized proceeds. Outcomes are not selected solely from winning purchases.

## R1.8 — Verify one complete embedded journey

### Embedded tasks

Add contract, evaluator, storage and allocation regression suites under `tests/`, preserving the existing deterministic tests. Use separate fixture sets for different mechanism families and verify that none require stock-market or oil data.

Exercise create → inspect → save → reload → link candidate → allocate → change assumptions → revalidate → record outcome. Check sign-out/local-state behavior and phone/browser usability; record which platforms were actually tested rather than claiming native coverage from a web screenshot.

Run `pnpm validate`, check the changed files and credential exposure, save a project checkpoint and verify the private GitHub commit. A checkpoint, push, CI run, migration and production UI deployment remain separate events.

### Acceptance and handover to R2

R1 is complete when the reusable reasoning journey works, evidence and feasibility are distinct, constrained allocation is consistent, and decisions survive revisions. It is still not proof of forecasting quality.

R2 then selects a real-data pilot by relevance, rights and accessible evidence. Provider access is checked independently; eBay account-deletion delivery does not establish Browse search or listing-stream permissions. No new connector, recurring collector, destination change or money-handling flow is activated by this plan.

## Proposed implementation touchpoints

| Existing area | Planned change |
| --- | --- |
| `shared/` | Domain validation, mechanism registry, evaluator, money/allocation functions |
| `lib/market-data.ts` | Explicit sample adapter; replace inconsistent planning inputs without promoting sample values to evidence |
| `lib/` | Versioned thesis/decision/outcome storage |
| `app/(tabs)/index.tsx` and detail route | Thesis-led navigation and source/evidence inspection |
| `app/(tabs)/plan.tsx` | Consistent cash, reserve, quantity and alternative-use behavior |
| `components/` | Reusable reasoning, evidence and outcome controls |
| `tests/` | Contract, coverage, temporal, persistence and allocation regression cases |
| `server/` and `drizzle/`, only if cloud sync is added | Owner-scoped persistence, protected API and reviewed migration |

Names of new modules and routes are proposed implementation locations, not existing files or activated endpoints.
