# Top Cherry — Core specification: economic transmission to actionable opportunities

**Version:** 2.0 — accepted direction, 14 October 2026  
**Implementation status:** This is the controlling product specification. The existing application is a listing-and-allocation prototype; the transmission engine specified here is not yet implemented.

## The decision that changes the project

Top Cherry is an economic-transmission and opportunity-allocation system. It models how changes in connected markets alter the populations buying and selling goods, their constraints, and the prices and liquidity that follow. It then identifies where available capital can capture a resulting opportunity.

**It does not start with cheap listings and append macroeconomic commentary. It starts with the economic relationships that produce opportunities, using listings as observations and possible execution points.**

This specification supersedes the earlier listing-first premise and the interpretation of wider context as a supplementary panel. Earlier progress assessments remain historical records; their implementation-status findings still apply. The economic-context framework remains supporting material, not the controlling architecture.

Stock-market wealth and oil-market changes are first-class upstream inputs, not merely examples of news to monitor. Their effects travel through identifiable buyer populations, producer incomes, costs, expectations and funding conditions. The engine must represent those relationships before assigning a listing an opportunity label.

## The unit of reasoning

The primary analytical object is a **transmission thesis**, not a listing or an isolated score. It links an observed change to an affected population, a mechanism, an expected market response, evidence, and a capital decision.

A thesis follows this structure:

> Driver changes → exposed buyers, sellers or producers → changed wealth, costs, constraints or expectations → demand, supply and liquidity response → price-adjustment opportunity → feasible allocation → observed outcome.

The system must work in both directions. Upstream changes generate questions about which goods and markets should respond. Unexpected listing behavior generates questions about which mechanisms could explain it. Feedback revises the relationship model rather than merely tweaking a card's score.

Different economic channels can act simultaneously, with opposite signs and different delays. The model is a time-indexed relationship graph, not a universal chain that always ends in a price increase. Economic feedback loops are permitted; any implementation must bound evaluation and prevent repeated propagation from counting the same evidence multiple times.

## Two foundational relationship paths

### Equity markets, wealth and luxury demand

The starting relationship is the transmission from financial-asset wealth and expectations to purchasing behavior among exposed luxury buyers. Equity prices, relevant market drawdowns and volatility enter the model through the buyer population they affect—not as decorative charts beside a watch listing.

The thesis should distinguish asset-owning buyer segments, geographic exposure, discretionary purchasing capacity, seller behavior and category liquidity. A luxury company's share price is not interchangeable with the wealth of that company's customers. A broad index is a proxy only when the exposure rationale is recorded.

The question is: which categories and buyer markets are responding, how quickly, and is the offered inventory adjusting ahead of or behind that response? Magnitude and timing require category-specific calibration; acknowledging the wealth channel does not justify inventing a numerical luxury-price elasticity.

### Oil markets, income distribution and costs

Oil-price changes have multiple routes into luxury and secondhand markets. The model must separate the income channel for oil-exposed producers or buyer populations from energy, transport, input-cost and purchasing-power channels elsewhere.

A change can support one buyer population while constraining another. It can alter replacement costs without improving resale liquidity. The reason for the oil-price movement also matters: a supply interruption and stronger global demand are not interchangeable events simply because the quoted oil price rises.

These are core relationships in the system model. Their application to a specific product, buyer market and holding period is what must be measured. Neither “oil up means all luxury up” nor “oil up means all consumption down” is an acceptable rule.

## The economic system to represent

**Drivers:** financial markets, commodity markets, funding conditions, currencies, real income, production and replacement supply, policy, geopolitical disruptions, technological change and attention/adoption.

**Populations:** buyer segments, seller segments, producers, repairers, distributors and communities. Segments describe observable economic exposure and behavior; do not infer an individual's private wealth or financial distress from a location or listing.

**Market structure:** substitutes, concentration, platform visibility, fees, trust, entry barriers, geography, repair ecosystems, stock constraints and access to buyers.

**Responses:** changes in participation, asking prices, verified transactions where available, inventory, repricing, delivery costs, withdrawal, resale liquidity and holding times. A vanished listing is not automatically a sale.

**Opportunities:** a documented mismatch between observable conditions and a plausible adjustment, with costs, quantity, timing and the alternative use of capital made explicit. A narrative without executable observations is a thesis to monitor, not a ready opportunity.

## What becomes of the three layers

The three layers remain complementary evidence views inside one reasoning process—not independent numbers added together.

**Visible layer:** what is actually observable about participants, products, listings, prices, quantities and feasible transaction economics. Search and source coverage are part of every observation.

**Behavioral layer:** how those populations and market states respond over time, and which transmission mechanisms explain the response. Distinguish recognized economic channels, observed association and stronger causal evidence.

**Novelty/network layer:** how new utility, adoption, social diffusion and complementary services amplify, redirect or weaken those responses. Virality, paid exposure, genuine adoption and direct or indirect network effects are different phenomena. They influence the common system model rather than automatically generating a speculative premium.

Marketplaces are sensors and potential transaction channels. Search is a way to collect evidence, not the product's intelligence. A broad stream of listings is useful only when its coverage and role in the economic model are understood.

## Core data model

The following are proposed domain records, not claims that database tables already exist.

**Economic node:** a driver, population, product family, market, institution or platform. Store geography, currency and relevant identity separately. Brand nationality, manufacturing origin, warehouse location and buyer market must not be conflated.

**Transmission edge:** source and destination nodes, mechanism, exposure conditions, conditional direction, time horizon, supporting evidence, alternatives and evidence status. Distinguish a documented mechanism from an estimated coefficient. Store any calibrated parameters with their sample, period and version; absent parameters remain unknown.

**Observation:** node or relationship measured, value, unit, currency, collection method, coverage, economic/event time, publication time, ingestion time and revision/vintage. Public-market series must identify whether the variable is a price level, return, volatility or other measure. Retain what was available at the decision time.

**Population exposure:** the basis for connecting a buyer, seller or producer segment to a driver, plus coverage and uncertainty. Exposure is not a presumption that everyone in a country behaves alike.

**Transmission thesis:** driver observations, ordered relationship paths, expected responses, holding horizon, competing explanations, supporting observations, predefined invalidation conditions and state: draft, monitoring, supported, contradicted or expired.

**Executable candidate:** a thesis-linked listing or batch, exact source link, confirmed availability and quantity, acquisition and exit markets, all-in costs, comparable evidence, eligibility checks and data gaps. Keep thesis-free baseline candidates for evaluation and comparison.

**Capital decision:** pool amount, reserve, allocations, quantity and exposure constraints, feasible alternatives, scenarios, cost coverage and thesis/model versions. This is decision support; money collection or execution is not implied.

**Outcome:** later observations, actual costs and proceeds where known, unsold inventory, holding time, abandoned decisions and the effect on the thesis. Do not evaluate only successful purchases or treat missing outcomes as successes.

## Recommendation logic

First detect a relevant driver change or unexplained market response. Identify affected populations and activate applicable relationship paths. Form or revise a thesis, then collect observations that can support or contradict it.

Only then identify executable candidates and assess whether their prices, costs, availability and exit markets support an opportunity. Compare the candidate with plausible alternatives, including waiting or retaining cash. A cheap listing can be rejected when the predicted buyer market is weakening or exit capacity is inadequate.

Separate three outputs: **relationship evidence**, **market-response estimate**, and **deal feasibility**. A strong general mechanism does not supply a precise resale price. A good historical relationship does not establish current stock. Unknown essential inputs prevent a candidate from being marked ready, but do not prevent the system from explaining a thesis worth monitoring.

Do not introduce universal macro multipliers or combine arbitrary layer scores. Any trained estimator must specify its target, feature definitions, forecast horizon, training window and version. Calibrate delays and effects where data permit; otherwise retain explicit scenarios without invented probabilities.

## Capital and quantity

The pool changes the feasible decision, not merely the number displayed on a card. Affordability must use all-in acquisition cash, integer quantity, confirmed available stock and an explicit reserve. Exit proceeds and time can vary with quantity because the pool may exceed buyer depth or compete with its own inventory.

Compare concentration by economic exposure, not only by brand or category. Several apparently different opportunities may depend on the same equity-wealth cohort, oil-income cohort, currency or shipping route.

The current prototype's capital-share measure must not be presented as actual opportunity cost. Opportunity cost concerns the next-best feasible use of capital and time. A larger pool neither guarantees a better return nor requires full deployment.

## The application experience

Discover should lead with active transmission theses and affected markets, then show supporting or contradictory observations and executable candidates. A user can also start from a listing and inspect the economic relationships that could explain its price.

Each thesis should answer: what changed, who is exposed, through which mechanism, what response is expected, what evidence already exists, and what would disprove it? Each linked candidate should add: why this price and quantity are actionable, what costs and exit assumptions remain uncertain, and which alternatives exist.

Plan should compare thesis-linked allocations, shared exposures, reserves and scenarios. Workspace should distinguish provider access, observations collected, relationship calibration and delivery health. Successful account-deletion notifications are infrastructure evidence, not evidence of inventory coverage or predictive accuracy.

## Revised implementation sequence

### Phase R0 — Controlling specification

Adopt this specification, revise the repository purpose and tracker, and publish the architectural decision in Notion. Preserve historical assessments and working infrastructure. This is a documentation and direction change, not a claim that the new engine exists.

### Phase R1 — Relationship contracts and allocation correctness

Define shared schemas for observations, nodes, edges, population exposures, theses and decisions. Encode the equity-wealth-to-luxury and oil-income/cost paths as reference relationships with explicit exposure conditions and unknown coefficients. Test contrasting populations, conflicting channels, missing data and time lags using clearly separated fixtures.

Correct all-in cash, available stock, integer quantities, reserves and the opportunity-cost label in the planner. Exit gate: a thesis and its evidence can be represented and inspected without fabricated inputs, and no allocation exceeds cash or stock.

### Phase R2 — First live transmission slice

Choose one bounded product family and buyer market based on accessible, usable data. Independently verify eBay Browse access; a denied item-stream scope is not proof that Browse search is unavailable. Collect real listing observations together with the relevant upstream series, timestamps, coverage and exposure evidence. Start a defensible history rather than replacing absent history with sample signals.

Exit gate: real upstream observations and real candidate links are connected through an inspectable thesis; missing transaction evidence or insufficient history is clearly marked. No predictive-success claim is required or justified yet.

### Phase R3 — Response estimation and validation

Measure the relationship over time, compare competing explanations and use chronological holdouts. Compare listing/economics-only selection with transmission-informed selection after costs, unsold inventory and holding time. Track abstentions and coverage. Do not use revised or future data in earlier decisions.

Exit gate: a versioned estimator or explicitly limited scenario process has documented evidence, limitations and outcome tracking. Predictive value must be demonstrated rather than assumed from a compelling story.

### Phase R4 — Broader system and network feedback

Extend to additional economic paths, regions and product families. Add cross-platform identity, measured adoption, direct/indirect network effects and outcomes that can refine relationships. Listing-change subscriptions can improve observation frequency if permission is granted; they are not prerequisites for defining the core architecture.

### Phase R5 — Operational readiness

Verify persistent user-facing access, native/browser flows, alert execution, retention and erasure, hosted CI status and operational monitoring. Multi-contributor commitments and accounting remain separate product work if actual shared ownership is intended. No new subscriptions, scheduled collectors or money-handling flows are activated by this specification.

## Acceptance criterion for the redesigned product

A user should be able to trace a recommendation from an upstream economic change through exposed market participants and measured response to a feasible capital decision—and later see whether that reasoning held.

The product is not complete merely because it can search many platforms or generate convincing explanations. Its value is demonstrated when the relationship model improves which opportunities are selected or avoided, how much capital is committed, and when action is appropriate, relative to a simpler baseline.

## What this release does not change

This release changes the controlling specification, README and roadmap. It does not change application behavior, apply database migrations, enable providers, rotate credentials, update eBay destinations, deploy a UI, configure recurring work or establish live forecasting performance.
