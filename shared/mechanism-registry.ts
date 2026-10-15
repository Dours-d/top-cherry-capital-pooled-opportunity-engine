import type { DriverFamily, TransmissionEdge } from "./transmission";

export type MechanismDefinition = Pick<TransmissionEdge, "family" | "mechanism" | "applicability" | "expectedDirection" | "lag" | "horizon"> & {
  key: string;
  label: string;
  examples: string[];
};

export const MECHANISM_REGISTRY: MechanismDefinition[] = [
  {
    key: "wealth-discretionary-demand",
    label: "Wealth to discretionary demand",
    family: "wealth-demand",
    mechanism: "Changes in exposed household or investor balance sheets can alter willingness to spend on discretionary durable goods.",
    applicability: "Only where the target population is materially exposed and the timing is plausible.",
    expectedDirection: "mixed",
    lag: "Months to quarters",
    horizon: "Cycle-dependent",
    examples: ["equity wealth", "property wealth", "income expectations"],
  },
  {
    key: "funding-liquidity",
    label: "Funding and liquidity",
    family: "funding-liquidity",
    mechanism: "Financing conditions and available liquidity can change acquisition capacity, inventory holding and forced selling.",
    applicability: "Where participants rely on credit, refinancing or constrained working capital.",
    expectedDirection: "mixed",
    lag: "Weeks to quarters",
    horizon: "Funding-cycle dependent",
    examples: ["policy rates", "credit spreads", "cash availability"],
  },
  {
    key: "supply-replacement",
    label: "Supply, replacement and repair",
    family: "supply-replacement",
    mechanism: "Replacement availability, parts access and usable life can alter scarcity, reservation value and substitution.",
    applicability: "Where supply is constrained or the service life materially changes buyer choice.",
    expectedDirection: "mixed",
    lag: "Weeks to years",
    horizon: "Product-life dependent",
    examples: ["production cuts", "repairability", "parts availability"],
  },
  {
    key: "substitution-obsolescence",
    label: "Substitution and obsolescence",
    family: "substitution-obsolescence",
    mechanism: "A close substitute or technological change can divert demand even when the focal item's attention remains high.",
    applicability: "Where a credible substitute reaches the same exposed population.",
    expectedDirection: "negative",
    lag: "Weeks to years",
    horizon: "Adoption-dependent",
    examples: ["new model release", "alternative material", "format change"],
  },
  {
    key: "platform-visibility",
    label: "Platform structure and visibility",
    family: "institutional-platform",
    mechanism: "Ranking, fees, trust controls and platform concentration can change which supply and demand are visible without proving underlying demand.",
    applicability: "Where a platform mediates discovery, trust or transaction completion.",
    expectedDirection: "mixed",
    lag: "Days to months",
    horizon: "Policy and ranking-cycle dependent",
    examples: ["ranking change", "seller concentration", "fee change"],
  },
  {
    key: "adoption-complementary-network",
    label: "Adoption and complementary network effects",
    family: "adoption-network",
    mechanism: "Growth in complementary users, services or standards can increase usefulness; virality alone is not sufficient evidence.",
    applicability: "Where adoption changes the value or liquidity available to the target population.",
    expectedDirection: "positive",
    lag: "Weeks to years",
    horizon: "Adoption-dependent",
    examples: ["collector communities", "repair networks", "authentication services"],
  },
];

export function getMechanism(key: string): MechanismDefinition | undefined {
  return MECHANISM_REGISTRY.find((mechanism) => mechanism.key === key);
}

export function registerMechanism(definition: MechanismDefinition, registry = MECHANISM_REGISTRY): MechanismDefinition[] {
  if (registry.some((item) => item.key === definition.key)) throw new Error(`Mechanism key already exists: ${definition.key}`);
  return [...registry, definition];
}

export function mechanismFamilies(registry: MechanismDefinition[] = MECHANISM_REGISTRY): DriverFamily[] {
  return [...new Set(registry.map((mechanism) => mechanism.family))];
}
