import { z } from "zod";

export const contextDomainSchema = z.enum([
  "financial-wealth",
  "commodities-energy",
  "rates-credit",
  "fx-inflation-income",
  "supply-logistics",
  "policy-tax-customs",
  "geopolitics-sanctions",
  "households-labor",
  "market-structure-platforms",
  "technology-adoption",
  "climate-weather",
  "marketplace-outcomes",
]);
export type ContextDomain = z.infer<typeof contextDomainSchema>;

export const sourceTierSchema = z.enum(["primary", "first-party-api", "international-compilation", "interpretive"]);
export type SourceTier = z.infer<typeof sourceTierSchema>;

export const sourceAccessSchema = z.enum(["api", "download", "web", "manual", "restricted"]);
export type SourceAccess = z.infer<typeof sourceAccessSchema>;

export const sourceRegistryEntrySchema = z.object({
  id: z.string().min(1),
  domain: contextDomainSchema,
  authority: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  tier: sourceTierSchema,
  access: sourceAccessSchema,
  cadence: z.string().min(1),
  geographies: z.array(z.string().min(1)).min(1),
  variables: z.array(z.string().min(1)).min(1),
  role: z.enum(["driver", "exposure", "structure", "response", "eligibility", "outcome"]),
  revisionPolicy: z.string().min(1),
  limitations: z.array(z.string()),
  enabled: z.boolean(),
});
export type SourceRegistryEntry = z.infer<typeof sourceRegistryEntrySchema>;

export const sourceCoverageSchema = z.object({
  sourceId: z.string().min(1),
  latestObservationAt: z.string().datetime().nullable(),
  latestPublishedAt: z.string().datetime().nullable(),
  status: z.enum(["covered", "partial", "stale", "proxy-only", "blocked", "not-started"]),
  note: z.string().min(1),
  observationCount: z.number().int().nonnegative(),
});
export type SourceCoverage = z.infer<typeof sourceCoverageSchema>;

export const CONTEXT_DOMAINS: Array<{ id: ContextDomain; label: string; question: string }> = [
  { id: "financial-wealth", label: "Financial wealth", question: "Which exposed populations may change discretionary demand?" },
  { id: "commodities-energy", label: "Commodities and energy", question: "Which input, transport or income channels are changing?" },
  { id: "rates-credit", label: "Rates and credit", question: "Is funding becoming easier, harder or more selective?" },
  { id: "fx-inflation-income", label: "FX, inflation and income", question: "How is purchasing power changing across markets?" },
  { id: "supply-logistics", label: "Supply and logistics", question: "Is replacement supply or delivery capacity changing?" },
  { id: "policy-tax-customs", label: "Policy, tax and customs", question: "Which rules alter cost, eligibility or repairability?" },
  { id: "geopolitics-sanctions", label: "Geopolitics and sanctions", question: "Which routes, counterparties or goods become risky or ineligible?" },
  { id: "households-labor", label: "Households and labor", question: "Which populations have income, employment or liquidity exposure?" },
  { id: "market-structure-platforms", label: "Market structure and platforms", question: "How do fees, ranking, trust and concentration shape visibility?" },
  { id: "technology-adoption", label: "Technology and adoption", question: "Is new utility spreading through users or complements?" },
  { id: "climate-weather", label: "Climate and weather", question: "Which shocks change supply, logistics, repair or seasonality?" },
  { id: "marketplace-outcomes", label: "Marketplace outcomes", question: "Are prices, inventory, repricing and verified transactions changing?" },
];

const source = (entry: SourceRegistryEntry): SourceRegistryEntry => sourceRegistryEntrySchema.parse(entry);

export const SOURCE_REGISTRY: SourceRegistryEntry[] = [
  source({ id: "ecb-data", domain: "financial-wealth", authority: "European Central Bank", title: "ECB Data Portal", url: "https://data.ecb.europa.eu/", tier: "primary", access: "download", cadence: "varies by series", geographies: ["euro area", "EU", "national where available"], variables: ["financial assets", "liabilities", "income", "market prices"], role: "driver", revisionPolicy: "Series-specific vintages and revisions", limitations: ["Aggregate measures do not identify a product buyer cohort"], enabled: true }),
  source({ id: "iea-data", domain: "commodities-energy", authority: "International Energy Agency", title: "IEA data and statistics", url: "https://www.iea.org/data-and-statistics", tier: "international-compilation", access: "download", cadence: "monthly, quarterly or annual by series", geographies: ["global", "country", "regional"], variables: ["energy balances", "prices", "demand", "supply"], role: "driver", revisionPolicy: "Dataset-specific revision and release notes", limitations: ["Benchmark energy data is not a local delivered cost"], enabled: true }),
  source({ id: "ecb-transmission", domain: "rates-credit", authority: "European Central Bank", title: "Monetary policy transmission", url: "https://www.ecb.europa.eu/mopo/intro/transmission/html/index.en.html", tier: "primary", access: "web", cadence: "methodology reference", geographies: ["euro area"], variables: ["rates", "credit", "asset prices", "exchange rates"], role: "structure", revisionPolicy: "Methodology page; pair with dated series", limitations: ["Documents mechanisms but does not supply product-specific elasticities"], enabled: true }),
  source({ id: "eurostat-households", domain: "fx-inflation-income", authority: "Eurostat", title: "Household income, saving and investment statistics", url: "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Households_-_statistics_on_income,_saving_and_investment", tier: "international-compilation", access: "download", cadence: "quarterly or annual by series", geographies: ["EU", "member states"], variables: ["disposable income", "saving", "consumption", "wealth context"], role: "exposure", revisionPolicy: "Revisions and breaks documented by series", limitations: ["Household averages conceal segment variation"], enabled: true }),
  source({ id: "comtrade", domain: "supply-logistics", authority: "United Nations Statistics Division", title: "UN Comtrade Database", url: "https://comtrade.un.org/", tier: "international-compilation", access: "api", cadence: "monthly or annual by reporter", geographies: ["global", "country pairs"], variables: ["trade value", "trade quantity", "HS product", "origin and destination"], role: "response", revisionPolicy: "Reporter revisions and product-code changes", limitations: ["Trade aggregates do not prove reachable stock or delivery time"], enabled: true }),
  source({ id: "eu-customs", domain: "policy-tax-customs", authority: "European Commission", title: "Customs policy", url: "https://taxation-customs.ec.europa.eu/customs-4_en", tier: "primary", access: "web", cadence: "rule and notice dependent", geographies: ["EU", "member states"], variables: ["duties", "customs procedures", "thresholds", "import rules"], role: "eligibility", revisionPolicy: "Effective dates and transitional rules are authoritative", limitations: ["Application depends on product, value, origin and destination facts"], enabled: true }),
  source({ id: "eu-dual-use", domain: "geopolitics-sanctions", authority: "European Commission", title: "Dual-use export controls", url: "https://policy.trade.ec.europa.eu/help-exporters-and-importers/exporting-dual-use-items_en", tier: "primary", access: "web", cadence: "rule and list dependent", geographies: ["EU", "cross-border"], variables: ["controlled goods", "destinations", "licensing", "technical assistance"], role: "eligibility", revisionPolicy: "Lists and guidance change by legal instrument", limitations: ["Product classification and counterparties require specific facts"], enabled: true }),
  source({ id: "eurostat-labor", domain: "households-labor", authority: "Eurostat", title: "Eurostat data", url: "https://ec.europa.eu/eurostat/data/database", tier: "international-compilation", access: "api", cadence: "monthly, quarterly or annual by series", geographies: ["EU", "member states", "regions"], variables: ["employment", "wages", "income", "demographics"], role: "exposure", revisionPolicy: "Series metadata and revisions must be retained", limitations: ["Population averages are not individual financial profiles"], enabled: true }),
  source({ id: "eu-dsa", domain: "market-structure-platforms", authority: "European Commission", title: "Digital Services Act impact on platforms", url: "https://digital-strategy.ec.europa.eu/en/policies/dsa-impact-platforms", tier: "primary", access: "web", cadence: "policy and reporting dependent", geographies: ["EU", "platform-specific"], variables: ["platform obligations", "recommender transparency", "systemic-risk context"], role: "structure", revisionPolicy: "Legal and platform-reporting dates must be recorded", limitations: ["Transparency does not reveal complete ranking or demand denominators"], enabled: true }),
  source({ id: "oecd-data", domain: "technology-adoption", authority: "OECD", title: "OECD Data", url: "https://www.oecd.org/en/data.html", tier: "international-compilation", access: "download", cadence: "varies by series", geographies: ["OECD", "selected global"], variables: ["ICT adoption", "R&D", "productivity", "technology"], role: "driver", revisionPolicy: "Dataset-specific metadata and revisions", limitations: ["Adoption proxies may not measure durable usage or network value"], enabled: true }),
  source({ id: "copernicus-climate", domain: "climate-weather", authority: "Copernicus Climate Change Service", title: "Copernicus Climate Change Service", url: "https://climate.copernicus.eu/", tier: "primary", access: "download", cadence: "near-real-time, monthly or annual by product", geographies: ["global", "Europe", "grid-level"], variables: ["temperature", "precipitation", "hazards", "anomalies"], role: "driver", revisionPolicy: "Product-specific reanalysis and forecast vintages", limitations: ["Weather shocks require a mapped supply, route or population mechanism"], enabled: true }),
  source({ id: "ebay-browse", domain: "marketplace-outcomes", authority: "eBay", title: "Browse API item summary search", url: "https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search", tier: "first-party-api", access: "api", cadence: "request dependent", geographies: ["marketplace dependent"], variables: ["asking price", "condition", "listing identity", "shipping context"], role: "outcome", revisionPolicy: "Retrieval timestamps and item revisions must be stored", limitations: ["Asking prices are not verified transactions; access and coverage are permission dependent"], enabled: true }),
];

export function getSourcesForDomain(domain: ContextDomain, registry = SOURCE_REGISTRY): SourceRegistryEntry[] {
  return registry.filter((entry) => entry.domain === domain && entry.enabled);
}

export function summarizeSourceCoverage(input: {
  registry?: SourceRegistryEntry[];
  coverage: SourceCoverage[];
  asOf: string;
  staleAfterDays: number;
}) {
  const registry = input.registry ?? SOURCE_REGISTRY;
  const coverageBySource = new Map(input.coverage.map((item) => [item.sourceId, item]));
  const asOfMs = Date.parse(input.asOf);
  const staleMs = input.staleAfterDays * 24 * 60 * 60 * 1000;
  const domains = CONTEXT_DOMAINS.map((domain) => {
    const sources = getSourcesForDomain(domain.id, registry);
    const domainCoverage = sources.map((source) => coverageBySource.get(source.id));
    const statuses = domainCoverage.map((item) => item?.status ?? "not-started");
    const latest = domainCoverage
      .map((item) => item?.latestObservationAt)
      .filter((date): date is string => Boolean(date))
      .map((date) => Date.parse(date))
      .filter(Number.isFinite);
    const stale = latest.length > 0 && Math.max(...latest) < asOfMs - staleMs;
    const hasCovered = statuses.includes("covered");
    const hasPartial = statuses.includes("partial") || statuses.includes("proxy-only");
    const status = hasCovered && !stale ? "covered" : stale ? "stale" : hasPartial ? "partial" : statuses.includes("blocked") ? "blocked" : "not-started";
    return { domain: domain.id, label: domain.label, status, sourceCount: sources.length, observedSourceCount: domainCoverage.filter(Boolean).length, latestObservationAt: latest.length ? new Date(Math.max(...latest)).toISOString() : null };
  });
  return {
    asOf: input.asOf,
    staleAfterDays: input.staleAfterDays,
    domains,
    counts: {
      covered: domains.filter((item) => item.status === "covered").length,
      partial: domains.filter((item) => item.status === "partial").length,
      stale: domains.filter((item) => item.status === "stale").length,
      blocked: domains.filter((item) => item.status === "blocked").length,
      notStarted: domains.filter((item) => item.status === "not-started").length,
    },
  };
}
