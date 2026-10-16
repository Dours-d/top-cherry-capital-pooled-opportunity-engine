# Top Cherry — Transmission-first roadmap

**Current gate:** AML-0 / market-fit assessment. Feature development is temporarily paused while the operating model, user problem and regulatory perimeter are tested.

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
- [ ] R1.6 Correct planner affordability: all-in acquisition cash, confirmed stock, integer quantity and explicit reserve.
- [ ] R1.7 Outcomes and revision loop.
- [ ] R1.8 End-to-end acceptance.

## Later phases — paused
R2 real-data ingestion, R3 response estimation, R4 network feedback and R5 operational readiness remain paused. In particular, no eBay listing feed, recurring collector, money-handling feature, investor onboarding or pooled-capital workflow is activated by this assessment.

## Existing boundaries
- eBay account-deletion delivery does not establish Browse search or listing-stream permissions.
- GitHub source synchronization, hosted CI, database migration, checkpoints, UI deployment and provider access are separate gates.
- Current three-layer signals are sample evidence views, not live predictive evidence.
- No credentials, eBay destinations, subscriptions, recurring jobs, migrations or money-handling features are changed by the AML-0 pause.

## Next artifact
See `top-cherry-market-fit-aml-phase-assessment-2026-10-15.md` for the market-fit questions, operating-model options, AML risk register and go/no-go criteria.
