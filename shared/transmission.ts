import { z } from "zod";

export const driverFamilySchema = z.enum([
  "wealth-demand",
  "funding-liquidity",
  "supply-replacement",
  "substitution-obsolescence",
  "institutional-platform",
  "adoption-network",
  "other",
]);
export type DriverFamily = z.infer<typeof driverFamilySchema>;

export const recordStatusSchema = z.enum(["draft", "monitoring", "ready", "closed", "invalidated"]);
export type RecordStatus = z.infer<typeof recordStatusSchema>;

export const provenanceSchema = z.object({
  kind: z.enum(["provider", "manual", "demonstration"]),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url().nullable().default(null),
  retrievedAt: z.string().datetime().nullable().default(null),
  reference: z.string().max(240).nullable().default(null),
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const economicNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["driver", "population", "market", "platform", "candidate"]),
  geography: z.string().nullable().default(null),
  description: z.string().max(1000).nullable().default(null),
});
export type EconomicNode = z.infer<typeof economicNodeSchema>;

export const transmissionEdgeSchema = z.object({
  id: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  family: driverFamilySchema,
  mechanism: z.string().min(1).max(1000),
  applicability: z.string().min(1).max(1000),
  expectedDirection: z.enum(["positive", "negative", "mixed", "unknown"]),
  lag: z.string().min(1).max(160),
  horizon: z.string().min(1).max(160),
  evidenceStatus: z.enum(["supported", "partial", "hypothesis", "scenario"]),
  evidenceIds: z.array(z.string()),
  competingEdgeIds: z.array(z.string()),
  invalidationConditions: z.array(z.string()),
});
export type TransmissionEdge = z.infer<typeof transmissionEdgeSchema>;

export const populationExposureSchema = z.object({
  id: z.string().min(1),
  populationNodeId: z.string().min(1),
  edgeId: z.string().min(1),
  exposure: z.enum(["direct", "indirect", "uncertain"]),
  rationale: z.string().min(1).max(1000),
  evidenceIds: z.array(z.string()),
});
export type PopulationExposure = z.infer<typeof populationExposureSchema>;

export const moneySchema = z.object({
  minorUnits: z.number().int().finite(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  scale: z.number().int().min(0).max(4),
});
export type Money = z.infer<typeof moneySchema>;

export const observationSchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  metric: z.string().min(1).max(160),
  value: z.number().finite().nullable(),
  unit: z.string().min(1).max(40),
  money: moneySchema.nullable().default(null),
  scope: z.string().min(1).max(240),
  eventTime: z.string().datetime(),
  publishedAt: z.string().datetime().nullable().default(null),
  ingestedAt: z.string().datetime(),
  vintage: z.string().max(80).nullable().default(null),
  revisionOf: z.string().nullable().default(null),
  provenance: provenanceSchema,
});
export type Observation = z.infer<typeof observationSchema>;

export const thesisSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  title: z.string().min(1).max(180),
  status: recordStatusSchema,
  nodeIds: z.array(z.string().min(1)).min(1),
  edgeIds: z.array(z.string().min(1)).min(1),
  exposureIds: z.array(z.string().min(1)),
  observationIds: z.array(z.string().min(1)),
  asOf: z.string().datetime(),
  claim: z.string().min(1).max(1600),
  unknowns: z.array(z.string()),
  invalidationConditions: z.array(z.string()),
  provenance: provenanceSchema,
});
export type Thesis = z.infer<typeof thesisSchema>;

export const candidateSchema = z.object({
  id: z.string().min(1),
  thesisId: z.string().min(1),
  title: z.string().min(1).max(240),
  sourceUrl: z.string().url(),
  asking: moneySchema,
  estimatedValue: moneySchema.nullable().default(null),
  availableUnits: z.number().int().nonnegative().nullable().default(null),
  observedAt: z.string().datetime(),
  status: z.enum(["unverified", "feasible", "blocked", "acquired", "exited"]),
});
export type Candidate = z.infer<typeof candidateSchema>;

export const capitalDecisionSchema = z.object({
  id: z.string().min(1),
  thesisId: z.string().min(1),
  candidateId: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  reserve: moneySchema,
  committed: moneySchema,
  decisionTime: z.string().datetime(),
  assumptions: z.array(z.string()),
});
export type CapitalDecision = z.infer<typeof capitalDecisionSchema>;

export const outcomeSchema = z.object({
  id: z.string().min(1),
  decisionId: z.string().min(1),
  status: z.enum(["unknown", "held", "sold", "abandoned", "withdrawn", "contradicted"]),
  actualCosts: moneySchema.nullable().default(null),
  proceeds: moneySchema.nullable().default(null),
  quantityHeld: z.number().int().nonnegative().nullable().default(null),
  elapsedDays: z.number().int().nonnegative().nullable().default(null),
  observedAt: z.string().datetime(),
  notes: z.string().max(2000).nullable().default(null),
});
export type Outcome = z.infer<typeof outcomeSchema>;

export function validateMoney(value: Money): Money {
  return moneySchema.parse(value);
}

export function validateTransmissionSet(input: {
  nodes: EconomicNode[];
  edges: TransmissionEdge[];
  exposures: PopulationExposure[];
  observations: Observation[];
  thesis: Thesis;
}) {
  const nodes = z.array(economicNodeSchema).parse(input.nodes);
  const edges = z.array(transmissionEdgeSchema).parse(input.edges);
  const exposures = z.array(populationExposureSchema).parse(input.exposures);
  const observations = z.array(observationSchema).parse(input.observations);
  const thesis = thesisSchema.parse(input.thesis);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeIds = new Set(edges.map((edge) => edge.id));
  const observationIds = new Set(observations.map((observation) => observation.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) throw new Error(`Unknown node in edge ${edge.id}`);
  }
  for (const exposure of exposures) {
    if (!nodeIds.has(exposure.populationNodeId) || !edgeIds.has(exposure.edgeId)) throw new Error(`Unknown reference in exposure ${exposure.id}`);
  }
  for (const observation of observations) {
    if (!nodeIds.has(observation.nodeId)) throw new Error(`Unknown node in observation ${observation.id}`);
  }
  if (thesis.edgeIds.some((id) => !edgeIds.has(id))) throw new Error("Thesis references an unknown edge");
  if (thesis.observationIds.some((id) => !observationIds.has(id))) throw new Error("Thesis references an unknown observation");
  return { nodes, edges, exposures, observations, thesis };
}
