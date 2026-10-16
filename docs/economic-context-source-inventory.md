# Top Cherry economic-context source inventory

**Status:** research baseline, 16 October 2026  
**Purpose:** make source coverage explicit before any live transmission pilot or predictive claim.

This inventory is a **coverage baseline**, not a claim that every relevant dataset has been found. It is designed around the product’s mechanism-agnostic specification: drivers, exposed populations, market structure, responses, opportunities and outcomes. Sources should be admitted when they add a measurable variable, a new geography, a new exposed population, a better revision history, or a better observation of a response.

## Coverage matrix

| Domain | Main question | Priority source families | Typical role | Principal blind spot |
|---|---|---|---|---|
| Financial wealth | Which asset-owning or expectation-sensitive populations may change discretionary demand? | Central-bank financial accounts, national accounts, official market data, household surveys | Driver and exposure context | Aggregate indices do not identify the exposed buyer segment |
| Commodities and energy | Which input, transport or income channels are changing? | IEA, EIA, Eurostat, national energy agencies, commodity exchanges | Driver, cost and scenario context | Benchmark prices are not local delivered costs |
| Rates and credit | Is funding becoming easier, harder or more selective? | ECB, BoE, Fed, BIS, IMF, central-bank lending surveys | Funding, liquidity and holding-period context | Policy rates do not equal a small buyer’s effective financing cost |
| FX, inflation and income | How does purchasing power change across markets? | Eurostat, national statistics offices, ECB, IMF, World Bank, OECD | Price, currency and real-income normalization | CPI baskets and exchange rates may not match the product or buyer |
| Supply, trade and logistics | Is replacement supply or delivery capacity changing? | Eurostat, UN Comtrade, UNCTAD, WTO, port and shipping authorities | Supply, route and landed-cost context | Trade aggregates hide product-level availability and delays |
| Policy, tax and customs | What rules alter eligibility, cost or repairability? | European Commission, national customs and tax authorities, regulators | Constraint and scenario gate | Rules vary by jurisdiction, product, value and date |
| Geopolitics and sanctions | Which routes, counterparties or goods become ineligible or risky? | EU/UK/US sanctions and export-control authorities, official event datasets | Eligibility and disruption gate | Event severity and commercial effect are not the same variable |
| Households and labor | Which populations have income, employment or liquidity exposure? | Eurostat, national statistics offices, OECD, ILO, World Bank | Exposure and demand context | Population averages conceal segment and geographic heterogeneity |
| Market structure and platforms | How are fees, ranking, trust and concentration shaping visibility and liquidity? | Competition authorities, DSA transparency, platform disclosures, official traffic or survey data | Structure and observation-coverage context | Platform visibility is not demand and platform data is often private |
| Technology and adoption | Is new utility spreading through users or complementary services? | Eurostat ICT, OECD, WIPO, national regulators, first-party adoption disclosures | Adoption/network layer | Attention, paid reach, virality and durable adoption are confounded |
| Climate and weather | Which events change supply, logistics, repair or seasonal demand? | Copernicus, ECMWF, EEA, WMO, national meteorological agencies | Shock, seasonality and exposure context | A weather event needs a mapped mechanism; it is not an automatic price signal |
| Marketplace outcomes | Are asking prices, inventory, repricing and verified transactions changing? | Platform APIs/exports, auction results, official fees and shipping calculators, user-collected observations | Candidate and response evidence | Disappeared listings are not automatically sales |

## Source hierarchy and admission rule

Use the strongest available source for the exact variable. Prefer, in order:

1. A primary statistical, regulatory, central-bank, market-operator or platform source with a documented methodology.
2. A first-party API or downloadable release with timestamps, units, geography and revision policy.
3. A reputable international compilation such as Eurostat, IMF, OECD, World Bank, UNCTAD, WTO or UN Comtrade when cross-country comparability is needed.
4. A transparent academic or industry source for interpretation, not as a substitute for the underlying observation.
5. A news item or commentary only as an event lead, never as the sole numerical input.

Every admitted source must have an owner, exact URL or dataset identifier, variable definition, unit, frequency, geography, publication timestamp, revision/vintage behavior, access method, licensing or usage restriction, and a stated role in a thesis. A source that cannot provide those fields may remain a qualitative lead but should not feed a scored opportunity.

## Inventory by economic context

### 1. Financial markets, wealth and luxury demand

Use the ECB Data Portal and financial accounts for euro-area financial assets, liabilities, income and distributional exposure; use national central banks and statistical offices for country-level household balance sheets. The ECB’s monetary-transmission material is useful for documenting the channels from rates and asset prices into financing, wealth and spending, but it is a mechanism reference rather than a product-specific coefficient.[1] [2]

For market prices, use the relevant regulated exchange or index administrator and store whether the series is a level, return, volatility measure, volume or breadth measure. For luxury demand, separate an asset-price proxy from actual category demand. Retail sales, auction results, platform sold data and company disclosures may be downstream observations, but a broad equity index must not be treated as direct evidence about a particular buyer cohort.

**Minimum fields:** instrument or index, market, currency, price/return/volatility definition, event time, publication time, household or buyer exposure rationale, and the competing explanation.

**Unknowns to preserve:** the mapping from aggregate wealth to a particular category, delay from market move to purchase behavior, and category-specific elasticity.

### 2. Commodities, oil, energy and input costs

Use the IEA for energy-market balances and outlook context, official national energy agencies for local prices and consumption, Eurostat for energy prices and industrial producer prices, and regulated benchmark administrators for crude and refined-product series.[3] [4] [5]

Oil must be represented as multiple possible channels: producer income, household purchasing power, transport cost, input replacement cost and macroeconomic expectations. Record the cause of a move where possible. A supply interruption and demand-driven price rise should not be collapsed into one “oil up” feature.

**Minimum fields:** benchmark and grade, location, spot/futures distinction, currency, tax inclusion, local delivered price if available, energy intensity of the affected population or product, and transmission lag.

**Unknowns:** the share of a product’s cost attributable to energy, pass-through timing, hedging, and whether a cost shock changes resale demand or only replacement cost.

### 3. Interest rates, credit, funding and liquidity

Use central-bank policy-rate releases, yield curves, lending surveys, credit aggregates and financial-stability publications. ECB, Bank of England, Federal Reserve, BIS and IMF sources provide complementary monetary and credit context.[1] [6] [7]

Store rates with tenor, instrument, fixing date and whether they are nominal, real, policy, market or borrower-specific. Credit availability, underwriting standards and spreads may matter more than the headline policy rate for the relevant population.

**Minimum fields:** rate type, tenor, geography, publication vintage, borrower population, spread or lending-standard measure, and whether the thesis needs financing or merely uses a discount-rate scenario.

**Unknowns:** small-business or consumer effective funding cost, credit rationing below aggregate statistics, and the relationship between funding stress and liquidation behavior.

### 4. Currencies, inflation, real income and purchasing power

Use Eurostat and national statistics offices for harmonised and national price indices, wages, disposable income and consumption; use ECB, IMF and World Bank sources for exchange rates and cross-country macro context.[2] [8] [9] [10]

Normalize every monetary observation by currency, date, tax treatment and price basis. A nominal price difference across countries is not an opportunity until shipping, duties, VAT, payment, FX conversion and exit-market costs are represented.

**Minimum fields:** price index definition, base period, nominal/real status, exchange-rate convention, income measure, household segment, and deflation or conversion method.

**Unknowns:** category-specific inflation, local willingness to pay, and how quickly wages or benefits adjust after a price shock.

### 5. Production, replacement supply, trade and logistics

Use Eurostat industrial production and producer prices, UN Comtrade for product-level trade flows, UNCTAD for trade and transport context, WTO for trade-policy context, and port or shipping authorities for route-level operational evidence.[5] [11] [12] [13]

Trade value and volume must be stored separately. A rise in import value may be price inflation rather than more units. Product codes, origin, destination, partner, mode and reporting period must be retained. Freight and delivery observations should be mapped to the actual route and service level, not substituted with a global freight index without qualification.

**Minimum fields:** product classification, quantity, value, origin/destination, trade direction, transport mode, route, delivery time, inventory or replacement proxy, and code-version changes.

**Unknowns:** grey-market flows, informal repair parts, stock held outside reporting systems, and the difference between official trade availability and reachable inventory.

### 6. Policy, tax, customs, product rules and repairability

Use the European Commission, national tax and customs authorities, product regulators and official consumer-protection sources. EU customs and VAT guidance must be evaluated by date and transaction facts. Product rules and right-to-repair measures can affect usable life, parts access and resale value.[14] [15]

Represent rules as dated eligibility and cost constraints, not as generic sentiment. Store jurisdiction, product scope, threshold, effective date, transition rule and source paragraph. A rule change can create a scenario without proving a market response.

**Minimum fields:** jurisdiction, legal instrument, effective date, product/category scope, value threshold, tax/duty treatment, compliance actor and uncertainty.

**Unknowns:** enforcement intensity, informal compliance, and actual pass-through into secondhand prices.

### 7. Geopolitical disruption, sanctions and country risk

Use official EU, UK and US sanctions lists and export-control guidance for eligibility; use official conflict, trade and transport sources for disruption evidence. EU dual-use controls are an example of why a potentially profitable route can be disqualified before economics are considered.[16]

Sanctions and export controls are hard gates. The system should reject or escalate a candidate when identity, destination, product classification or counterparty information is incomplete. Do not infer political or financial-risk status from nationality alone.

**Minimum fields:** list or instrument, covered person/entity/goods, jurisdiction, effective date, route, counterparties, screening timestamp and unresolved identity ambiguity.

**Unknowns:** unreported transshipment, beneficial ownership, and the operational effect of a geopolitical event on a specific marketplace.

### 8. Households, labor, demographics and exposed populations

Use Eurostat, national statistics offices, OECD, ILO and World Bank sources for employment, wages, household income, consumption, demographics and migration.[8] [9] [10] [17]

Population exposure must be explicit. “Country income” is not a substitute for the buyer segment. Store the mechanism connecting a driver to a population, coverage, geography, cohort definition and uncertainty. Avoid inferring private wealth, distress or intent from a listing location.

**Minimum fields:** population definition, sample or census basis, geographic level, income concept, age/cohort, employment status, sampling error and publication lag.

**Unknowns:** category-specific budgets, informal income, willingness to pay, and within-region dispersion.

### 9. Market structure, competition, platforms and visibility

Use competition-authority decisions and market studies, Digital Services Act transparency materials, platform disclosures and official surveys where available. The European Commission’s DSA materials help distinguish platform recommender transparency and systemic risk from actual buyer demand.[18]

Track platform fees, seller entry, ranking exposure, trust signals, search-result coverage and policy changes separately. A higher listing count can reflect platform exposure or seller behavior rather than stronger demand. Platform ranking is an observation filter that can bias the visible sample.

**Minimum fields:** platform, market side, fee schedule, ranking or exposure definition, search method, timestamp, sample coverage, policy/version change and selection bias.

**Unknowns:** platform denominator, suppressed or unobserved listings, paid promotion, and algorithm changes.

### 10. Technology, adoption and network effects

Use Eurostat ICT, OECD technology indicators, WIPO patent data, national regulators and first-party adoption disclosures. Direct user growth, complementary-service growth, social attention, paid reach and durable usage must be separate variables.

Network effects should enter a thesis only when the affected sides, adoption measure, lag and failure mode are specified. Novelty is not a price premium. It may change participation, search cost, trust, supply coordination or exit depth.

**Minimum fields:** user or account definition, active versus registered users, geography, cohort, retention or repeat use, complement availability, adoption date and measurement bias.

**Unknowns:** causality between adoption and value, paid versus organic growth, and whether network effects survive a platform-policy change.

### 11. Climate, weather, disasters and seasonality

Use Copernicus, ECMWF, EEA, WMO and national meteorological agencies for weather and climate observations. EEA’s economic-loss indicators show why event data needs geographic and asset-exposure mapping rather than a generic climate score.[19] [20]

Store event time, forecast versus realized status, spatial resolution, severity measure and affected infrastructure. A weather shock may alter logistics, production, repair or seasonal demand; the pathway must be stated.

**Minimum fields:** hazard, location, duration, observed/forecast status, anomaly relative to baseline, exposed route or population, and mechanism lag.

**Unknowns:** insurance coverage, substitution, stock buffers, and whether a disruption creates demand or only delays transactions.

### 12. Marketplace prices, liquidity and transaction outcomes

Use official marketplace APIs, permitted exports, auction result pages, platform fee and shipping calculators, and first-party transaction records where legally and technically permitted. eBay Browse and notification documentation can describe access boundaries, but account-deletion notifications do not establish inventory or sold-item coverage.[21] [22]

Keep four states separate: asking, reserved, sold/verified, and disappeared/unknown. Record the exact URL or item identifier, retrieval time, price and currency, condition, quantity, shipping, fees, location and availability. Use repeated observations to detect repricing and withdrawals; do not label a vanished listing as a sale.

**Minimum fields:** source, item identity, observation timestamp, event timestamp if known, asking/sold status, price basis, condition, quantity, delivery and fee assumptions, and retrieval coverage.

**Unknowns:** private transactions, stale listings, duplicate cross-posts, seller intent, and platform changes.

## Good-practice controls for exhaustivity

**Coverage control.** Maintain a registry of domains, source families, variables and geographies. A thesis must report which relevant domains were checked and which were unavailable. “No evidence found” is not equivalent to “no effect.”

**Vintage control.** Store event time, publication time, ingestion time and revision/vintage. Re-evaluation must use only information available at the decision time. Revised historical values should not silently rewrite prior decisions.

**Comparability control.** Keep currency, unit, tax basis, geography, population, product classification and seasonal adjustment explicit. Do not merge series solely because their labels look similar.

**Mechanism control.** Separate documented mechanism, observed association, calibrated estimate and scenario assumption. Unknown coefficients stay unknown. Conditional signs remain conditional.

**Selection control.** Record search terms, filters, pagination, excluded sources, platform and time window. A marketplace sample is not a market census.

**Outcome control.** Record unsold, abandoned, withdrawn and unknown outcomes. Do not evaluate only successful purchases.

**Admission control.** Add a source only when it improves variable definition, coverage, timeliness, geography, revision transparency or response observation. Every source addition should include a reason, owner and retirement condition.

## Priority inventory for the first real pilot

Before any R2 live-transmission slice, select one bounded market and assemble, at minimum:

1. One upstream driver series with a documented mechanism.
2. One affected-population or exposure series.
3. One market-local supply, demand or replacement-cost series.
4. One platform-observation stream with retrieval coverage.
5. One cost and eligibility source for tax, shipping, FX and sanctions.
6. One outcome path capable of recording repricing, sale, withdrawal, holding time or abandonment.

The pilot should be rejected if it has only a macro narrative, only asking prices, no population exposure basis, no timestamped vintage, or no way to observe invalidation.

## References

[1]: https://www.ecb.europa.eu/mopo/intro/transmission/html/index.en.html "ECB monetary policy transmission"
[2]: https://data.ecb.europa.eu/ "ECB Data Portal"
[3]: https://www.iea.org/data-and-statistics "International Energy Agency data and statistics"
[4]: https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Energy_price_statistics "Eurostat energy price statistics"
[5]: https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Industrial_producer_price_index_overview "Eurostat industrial producer price index"
[6]: https://www.bis.org/statistics/ "Bank for International Settlements statistics"
[7]: https://www.imf.org/en/Data "IMF Data"
[8]: https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Households_-_statistics_on_income,_saving_and_investment "Eurostat household income, saving and investment statistics"
[9]: https://data.worldbank.org/ "World Bank Open Data"
[10]: https://www.oecd.org/en/data.html "OECD Data"
[11]: https://comtrade.un.org/ "UN Comtrade Database"
[12]: https://unctad.org/statistics "UN Trade and Development statistics"
[13]: https://www.wto.org/english/res_e/statis_e/statis_e.htm "World Trade Organization statistics"
[14]: https://taxation-customs.ec.europa.eu/customs-4_en "European Commission customs policy"
[15]: https://commission.europa.eu/law/law-topic/consumer-protection-law/directive-repair-goods_en "European Commission right to repair directive"
[16]: https://policy.trade.ec.europa.eu/help-exporters-and-importers/exporting-dual-use-items_en "European Commission dual-use export controls"
[17]: https://ilostat.ilo.org/data/ "ILO data"
[18]: https://digital-strategy.ec.europa.eu/en/policies/dsa-impact-platforms "European Commission Digital Services Act impact on platforms"
[19]: https://climate.copernicus.eu/ "Copernicus Climate Change Service"
[20]: https://www.eea.europa.eu/en/analysis/indicators/economic-losses-from-climate-related "European Environment Agency economic losses from climate extremes"
[21]: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search "eBay Browse API item summary search"
[22]: https://developer.ebay.com/develop/api/sell/notification_api "eBay Notification API"
