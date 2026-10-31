# Top Cherry — AML-0 decision plan

**Purpose:** Decide whether Top Cherry can complete the AML-0 / market-fit gate and which operating boundary, if any, may be opened afterward.

**Status:** Planning artifact. This is not legal advice, regulatory clearance, a KYC design, or permission to handle money, custody assets, execute purchases, arrange investments, or make individualized financial-instrument recommendations.

## 1. Decision to make

The decision is not “can we launch a pooled-investment product?” The first decision is narrower:

> Can Top Cherry demonstrate a repeated, valuable research problem for a defined user segment while remaining non-custodial, non-executing, evidence-linked and non-personalized—and can a qualified UK/EU perimeter review confirm the next safe operating boundary?

The default outcome is **continue research-only**. Any move toward referral, coordinated purchasing, pooled ownership, execution, custody, investor onboarding or individualized financial-instrument recommendations requires a new perimeter decision and specialist review.

## 2. Completion definition

AML-0 is complete only when all six roadmap work packages have an evidence artifact and the exit gate is signed off:

1. **Boundary freeze:** a versioned one-page product boundary is approved and visible in the product and research materials.
2. **Market-fit discovery:** distinct cohorts have been interviewed using anonymized records, with a repeated problem and measurable value identified—or the product has been stopped/reframed.
3. **Operating-model comparison:** the five documented models are compared using the same criteria and one preferred current model is selected.
4. **Funds and asset flows:** the selected model has an end-to-end flow map, including actors, jurisdictions, ownership, money movement, failure states and responsibilities.
5. **Specialist perimeter review:** qualified UK/EU counsel or an appropriately authorized specialist reviews the actual asset, funds, jurisdiction and user flows in writing.
6. **Expansion triggers:** ownership, jurisdiction, AML/KYC responsibility, escalation rules and explicit stop triggers are assigned before any boundary expansion.

A completed internal checklist is not sufficient for item 5. If the specialist review is unavailable, ambiguous or conditional, the result is **hold at research-only**, not clearance.

## 3. Work packages and evidence

### AML-0.1 — Freeze the research-only boundary

**Deliverables**

- Versioned boundary statement: Top Cherry does not accept, hold, transfer or invest money; execute orders; guarantee returns; or make personal recommendations on financial instruments.
- Product-surface inventory showing where listings, theses, asking prices, simulated quantities, all-in costs, outcomes and outbound links appear.
- Red-team review of language that could imply custody, execution, guaranteed returns, individualized advice, verified stock or market value.
- Owner and approval date for boundary changes.

**Pass condition:** every current user flow is classified as research, simulation, evidence recording or third-party navigation, with no hidden money or execution path.

**Immediate stop condition:** a proposed feature requires a wallet, contribution, pooled return, direct purchase, order routing, counterparty matching, or personalized buy/hold/sell output.

### AML-0.2 — Market-fit discovery

**Cohorts to keep separate**

- professional or semi-professional resellers;
- small groups that currently coordinate physical purchases;
- research-oriented investors or analysts.

**Minimum interview record**

- anonymized participant code and cohort;
- urgent problem and current workaround;
- decision frequency and time cost;
- required evidence and acceptable freshness;
- desired action and what responsibility the participant expects Top Cherry to take;
- willingness to pay for one narrow outcome;
- disconfirming evidence or reason not to continue.

Do not request money, financial statements, identity documents, source-of-funds information or sensitive personal data during discovery.

**Decision rule:** do not combine cohorts into one average. Select a segment only if the same narrow problem recurs, users can describe a measurable outcome, and the outcome can be delivered without custody, execution or personalized regulated advice.

### AML-0.3 — Compare operating models

Score each model against the same questions: user value, evidence needed, revenue logic, operational responsibility, money movement, asset ownership, custody, execution, arranging/referral exposure, consumer/fraud risk, jurisdictional complexity and specialist review required.

| Model | Default AML-0 decision posture |
|---|---|
| Research and decision support | Candidate for the first test, subject to claims, privacy and promotion review |
| Referral or marketplace lead generation | Hold until arranging, promotion, agency and data responsibilities are reviewed |
| Coordinated physical purchasing | Defer until user need and title, payments, logistics, fraud and dispute responsibilities are defined |
| Pooled ownership or investment | Do not build or activate during AML-0 |
| Execution or custody | Out of scope pending specialist design and authorization analysis |

**Required output:** one selected current model, one rejected/deferred model register, and the assumptions that would reopen each deferred model.

### AML-0.4 — Map funds and asset flows

Create one diagram and one written table for the selected current model. For every step identify:

- user and service-provider actor;
- asset owner and loss bearer;
- funds source, destination, control and reconciliation point;
- jurisdiction and account/wallet involved;
- onboarding and verification responsibility;
- purchase, delivery, return, resale and proceeds responsibility;
- failure, fraud, dispute, sanctions and suspicious-activity escalation;
- data retained, retention period and deletion path.

The research-only flow should contain no Top Cherry-controlled customer funds, custody account, pooled ledger, purchase execution or return promise. If the model requires one, stop the model and move it to specialist review.

### AML-0.5 — Specialist perimeter review

Prepare a counsel briefing pack containing the selected model, user journey, claims, jurisdictions, asset type, payment/referral arrangements, funds/asset map, data map, and all proposed expansion triggers. Ask for written answers to:

- whether the current service is research/information, referral/arranging, advice, marketplace operation or another regulated activity;
- whether any proposed physical-goods coordination changes the analysis;
- which jurisdictions and user types are in scope;
- which activities require an authorized or regulated partner;
- what financial-promotion, consumer, payments, safeguarding, AML/KYC, sanctions, privacy and recordkeeping controls would be required;
- what facts would invalidate the opinion.

Do not ask counsel to bless an abstract “future platform.” The review must assess the actual current flow and a separately described hypothetical expansion.

### AML-0.6 — Expansion triggers and ownership

Create a trigger register with columns for trigger, affected surface, owner, required approval, jurisdiction, evidence required, stop action and restart authority. Minimum triggers include:

- pooled contributions, shared ownership or promised returns;
- wallet balances, custody or control of assets;
- direct debit/card collection for an investment or coordinated purchase;
- automated purchase or sale, order routing or counterparty matching;
- individualized financial-instrument recommendations;
- cross-border investor onboarding or high-risk jurisdictions;
- referral compensation or lead-generation arrangements;
- claims that imply guaranteed value, liquidity, stock or performance.

Every trigger must have a named owner and a release authority independent from the feature implementer.

## 4. Decision board

Hold one decision meeting only after the evidence pack is complete. Record the decision, dissent, open assumptions and expiry/review date.

### GO — continue research-only market-fit testing

Use this outcome only if:

- one segment has a repeated problem and measurable value;
- the chosen workflow is source-linked, non-custodial, non-executing and non-personalized;
- the asset and funds flow contains no hidden Top Cherry money or custody path;
- the claims and outbound links have been reviewed for promotion/consumer risk;
- specialist review has no unresolved blocker for the current boundary;
- every expansion trigger has an owner and stop action.

### HOLD — continue only bounded research work

Use this outcome if user value is plausible but evidence is incomplete, counsel is unavailable, the opinion is conditional, the jurisdiction is unresolved, or the asset/funds flow is not fully documented. Keep the current product research-only and do not open the affected surface.

### STOP or REFRAME

Use this outcome if users mainly want a conventional price-search tool, will not provide outcome feedback, demand depends on regulated recommendations, the only credible revenue model requires custody, or the team cannot state who owns the asset, controls money, bears loss and handles escalation.

## 5. Practical sequence

1. **Week 1:** approve the boundary statement, freeze copy changes that could expand claims, prepare the interview script and model-comparison template.
2. **Weeks 2–3:** conduct separate cohort interviews and a small concierge research-only pilot; record anonymized evidence and disconfirming findings.
3. **Week 4:** select or reject the narrow model and draw the funds/asset flows and responsibility matrix.
4. **Week 5:** prepare the specialist briefing pack and obtain written perimeter input; do not interpret silence as approval.
5. **Week 6:** complete the trigger register, decision board, expiry date and next-phase authorization record.

If evidence arrives earlier, the decision meeting may happen earlier. If any critical dependency is missing, the status remains HOLD.

## 6. What may continue during AML-0

Allowed: source-linked research, provenance and audit infrastructure, simulated all-in cost and quantity planning, thesis/evidence drafting, read-only provider access, outcome recording, privacy controls and bounded Workspace improvements.

Not allowed: money collection, pooled funds, custody, wallet balances, execution, order routing, counterparty matching, automated purchase/sale, guaranteed returns, hidden referral economics, or individualized recommendations about regulated financial instruments.

## 7. Final decision record

The final record should contain:

- selected cohort and narrow outcome;
- rejected/reframed cohorts and why;
- selected operating model and deferred models;
- funds/asset-flow diagram and responsibility matrix;
- specialist review date, scope, assumptions and conditions;
- expansion trigger register with owners;
- GO/HOLD/STOP decision, approver and expiry/review date;
- explicit list of product surfaces that remain disabled.
