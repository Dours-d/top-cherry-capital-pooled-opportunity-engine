import { evaluateThesis, type ThesisEvaluation } from "../shared/evaluate-thesis";
import type { EconomicNode, Observation, Thesis, TransmissionEdge } from "../shared/transmission";
import { getListingSignals, type Listing } from "./market-data";

export function buildDemoThesis(listing: Listing): {
  nodes: EconomicNode[];
  edges: TransmissionEdge[];
  observations: Observation[];
  thesis: Thesis;
  evaluation: ThesisEvaluation;
} {
  const signals = getListingSignals(listing);
  const asOf = "2026-10-15T00:00:00.000Z";
  const nodes: EconomicNode[] = [
    { id: `driver-${listing.id}`, label: "Visible scarcity", kind: "driver", geography: listing.location, description: "A sample inventory and price-pressure observation." },
    { id: `population-${listing.id}`, label: `${listing.profileSlug} buyers`, kind: "population", geography: listing.location, description: "The exposed secondary-market buyer population." },
    { id: `market-${listing.id}`, label: `${listing.platform} market`, kind: "market", geography: listing.location, description: "The visible marketplace context around this candidate." },
  ];
  const edges: TransmissionEdge[] = [{
    id: `edge-${listing.id}`,
    fromNodeId: `driver-${listing.id}`,
    toNodeId: `market-${listing.id}`,
    family: "supply-replacement",
    mechanism: "Contracting visible inventory may support reservation value when replacement supply is constrained.",
    applicability: "Only where the observation is representative enough and comparable condition is controlled.",
    expectedDirection: "mixed",
    lag: "Weeks to months",
    horizon: "Product and supply-cycle dependent",
    evidenceStatus: "partial",
    evidenceIds: [`obs-${listing.id}`],
    competingEdgeIds: [`competing-${listing.id}`],
    invalidationConditions: ["Inventory expands", "Verified sold outcomes do not follow the observed pressure"],
  }];
  const observations: Observation[] = [{
    id: `obs-${listing.id}`,
    nodeId: `driver-${listing.id}`,
    metric: "active-comparables",
    value: signals.activeComparables,
    unit: "count",
    money: null,
    scope: "Seeded sample; visible comparables only",
    eventTime: asOf,
    publishedAt: asOf,
    ingestedAt: asOf,
    vintage: "sample-2026-10",
    revisionOf: null,
    provenance: { kind: "demonstration", sourceName: "Top Cherry sample signals", sourceUrl: null, retrievedAt: null, reference: "Demonstration only; not live market evidence" },
  }];
  const thesis: Thesis = {
    id: `thesis-${listing.id}`,
    version: 1,
    title: `${listing.brand} ${listing.model} — visible scarcity thesis`,
    status: "monitoring",
    nodeIds: nodes.map((node) => node.id),
    edgeIds: edges.map((edge) => edge.id),
    exposureIds: [],
    observationIds: observations.map((observation) => observation.id),
    asOf,
    claim: "If visible inventory remains constrained and exposed buyers remain active, this candidate may deserve closer inspection before price discovery catches up.",
    unknowns: ["Verified transaction response is unknown", "The visible sample may not represent the full market", "Buyer exposure is not independently measured"],
    invalidationConditions: edges[0].invalidationConditions,
    provenance: observations[0].provenance,
  };
  return { nodes, edges, observations, thesis, evaluation: evaluateThesis({ nodes, edges, exposures: [], observations, thesis }) };
}
