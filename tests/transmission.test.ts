import { describe, expect, it } from "vitest";
import { evaluateThesis } from "../shared/evaluate-thesis";
import { MECHANISM_REGISTRY, mechanismFamilies, registerMechanism } from "../shared/mechanism-registry";
import { observationSchema, validateTransmissionSet, type EconomicNode, type Observation, type Thesis, type TransmissionEdge } from "../shared/transmission";

const nodes: EconomicNode[] = [
  { id: "driver-repair", label: "Repair access", kind: "driver", geography: "EU", description: null },
  { id: "population-owners", label: "Owners with repair demand", kind: "population", geography: "EU", description: null },
  { id: "market-used-audio", label: "Used audio market", kind: "market", geography: "EU", description: null },
];
const edges: TransmissionEdge[] = [{
  id: "edge-repair-value",
  fromNodeId: "driver-repair",
  toNodeId: "market-used-audio",
  family: "supply-replacement",
  mechanism: "Repair access can extend usable life and support reservation value.",
  applicability: "The target owners need repair access and replacement supply is constrained.",
  expectedDirection: "positive",
  lag: "Months",
  horizon: "Product-life cycle",
  evidenceStatus: "partial",
  evidenceIds: ["obs-repair"],
  competingEdgeIds: [],
  invalidationConditions: ["Parts become unavailable"],
}];
const observation: Observation = {
  id: "obs-repair",
  nodeId: "driver-repair",
  metric: "repair-parts-availability",
  value: 0.72,
  unit: "share",
  money: null,
  scope: "EU independent repair network sample",
  eventTime: "2026-09-01T00:00:00.000Z",
  publishedAt: "2026-09-05T00:00:00.000Z",
  ingestedAt: "2026-09-06T00:00:00.000Z",
  vintage: "2026-09",
  revisionOf: null,
  provenance: { kind: "manual", sourceName: "Demonstration source", sourceUrl: null, retrievedAt: null, reference: null },
};
const baseThesis: Thesis = {
  id: "thesis-repair-audio",
  version: 1,
  title: "Repair access supports used-audio reservation value",
  status: "monitoring",
  nodeIds: nodes.map((node) => node.id),
  edgeIds: ["edge-repair-value"],
  exposureIds: [],
  observationIds: ["obs-repair"],
  asOf: "2026-09-10T00:00:00.000Z",
  claim: "Where repair access is durable, some owners may retain used audio longer and value repairable units more.",
  unknowns: ["Observed resale response is unknown"],
  invalidationConditions: ["Repair parts become unavailable"],
  provenance: { kind: "demonstration", sourceName: "R1 fixture", sourceUrl: null, retrievedAt: null, reference: null },
};

describe("transmission contracts", () => {
  it("accepts a non-equity, non-oil mechanism path", () => {
    const result = validateTransmissionSet({ nodes, edges, exposures: [], observations: [observation], thesis: baseThesis });
    expect(result.thesis.id).toBe("thesis-repair-audio");
  });

  it("rejects an observation that references an unknown node", () => {
    expect(() => validateTransmissionSet({ nodes, edges, exposures: [], observations: [{ ...observation, nodeId: "missing" }], thesis: baseThesis })).toThrow("Unknown node");
  });

  it("keeps the registry extensible across mechanism families", () => {
    expect(mechanismFamilies()).toContain("supply-replacement");
    const next = registerMechanism({
      key: "weather-demand-shift",
      label: "Weather demand shift",
      family: "other",
      mechanism: "Weather changes short-term demand for exposed goods.",
      applicability: "Only for weather-sensitive categories and geographies.",
      expectedDirection: "mixed",
      lag: "Days",
      horizon: "Seasonal",
      examples: ["seasonality"],
    });
    expect(next).toHaveLength(MECHANISM_REGISTRY.length + 1);
  });

  it("returns monitoring when unknowns remain and ready when evidence is complete", () => {
    const monitoring = evaluateThesis({ nodes, edges, exposures: [], observations: [observation], thesis: baseThesis });
    expect(monitoring.status).toBe("monitoring");
    const ready = evaluateThesis({ nodes, edges, exposures: [], observations: [observation], thesis: { ...baseThesis, unknowns: [] } });
    expect(ready.status).toBe("ready");
  });

  it("blocks missing evidence instead of inventing a value", () => {
    const blocked = evaluateThesis({ nodes, edges, exposures: [], observations: [], thesis: { ...baseThesis, observationIds: [] } });
    expect(blocked.status).toBe("blocked");
    expect(blocked.missingObservationIds).toEqual(["obs-repair"]);
  });

  it("invalidates future observations relative to the thesis as-of time", () => {
    const future = { ...observation, eventTime: "2026-10-01T00:00:00.000Z" };
    const invalid = evaluateThesis({ nodes, edges, exposures: [], observations: [future], thesis: baseThesis });
    expect(invalid.status).toBe("invalid");
    expect(invalid.futureObservationIds).toEqual(["obs-repair"]);
  });

  it("requires explicit currency metadata for monetary observations", () => {
    expect(() => observationSchema.parse({ ...observation, value: 100, unit: "amount", money: { minorUnits: 10000, currency: "usd", scale: 2 } })).toThrow();
  });
});
