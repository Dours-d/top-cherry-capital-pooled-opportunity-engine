import { validateTransmissionSet, type Observation, type Thesis, type TransmissionEdge } from "./transmission";

export type ThesisEvaluation = {
  thesisId: string;
  asOf: string;
  status: "ready" | "monitoring" | "blocked" | "invalid";
  readinessReasons: string[];
  path: Array<{ edgeId: string; family: TransmissionEdge["family"]; mechanism: string; evidenceStatus: TransmissionEdge["evidenceStatus"] }>;
  supportingEvidence: string[];
  contradictoryEvidence: string[];
  missingObservationIds: string[];
  futureObservationIds: string[];
  duplicateObservationIds: string[];
  unknowns: string[];
  competingChannelIds: string[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

export function parseContradiction(value: string) {
  const match = value.match(/^\[contradiction\|(low|medium|high)\|([^\]]+)\](?:\[status:(open|resolved)\])?(?:\[reviewer:([^\]]+)\])?(?:\[resolvedAt:([^\]]+)\])?\s*(.*)$/i);
  if (!match) return null;
  return { severity: match[1].toLowerCase() as "low" | "medium" | "high", source: match[2], status: (match[3] ?? "open").toLowerCase() as "open" | "resolved", reviewer: match[4] ?? null, resolvedAt: match[5] ?? null, description: match[6] };
}

export function evaluateThesis(input: {
  nodes: Parameters<typeof validateTransmissionSet>[0]["nodes"];
  edges: Parameters<typeof validateTransmissionSet>[0]["edges"];
  exposures: Parameters<typeof validateTransmissionSet>[0]["exposures"];
  observations: Observation[];
  thesis: Thesis;
}): ThesisEvaluation {
  const { edges, observations, thesis } = validateTransmissionSet(input);
  const edgeMap = new Map(edges.map((edge) => [edge.id, edge]));
  const observationMap = new Map(observations.map((observation) => [observation.id, observation]));
  const asOfMs = Date.parse(thesis.asOf);
  const futureObservationIds = observations.filter((observation) => Date.parse(observation.eventTime) > asOfMs).map((observation) => observation.id);
  const duplicateObservationIds = observations.filter((observation, index) => observations.findIndex((candidate) => candidate.id === observation.id) !== index).map((observation) => observation.id);
  const path = thesis.edgeIds.flatMap((edgeId) => {
    const edge = edgeMap.get(edgeId);
    return edge ? [{ edgeId: edge.id, family: edge.family, mechanism: edge.mechanism, evidenceStatus: edge.evidenceStatus }] : [];
  });
  const expectedEvidenceIds = unique(thesis.edgeIds.flatMap((edgeId) => edgeMap.get(edgeId)?.evidenceIds ?? []));
  const thesisEvidenceIds = new Set(thesis.observationIds);
  const missingObservationIds = expectedEvidenceIds.filter((id) => !thesisEvidenceIds.has(id) || !observationMap.has(id));
  const supportingEvidence = thesis.observationIds.filter((id) => observationMap.has(id) && !futureObservationIds.includes(id));
  const contradictoryEvidence = thesis.unknowns.filter((unknown) => {
    const parsed = parseContradiction(unknown);
    return parsed ? parsed.status !== "resolved" : /contradict|against|conflict/i.test(unknown);
  });
  const competingChannelIds = unique(thesis.edgeIds.flatMap((edgeId) => edgeMap.get(edgeId)?.competingEdgeIds ?? []));
  const readinessReasons: string[] = [];
  if (missingObservationIds.length > 0) readinessReasons.push("Required observations are missing or unavailable.");
  if (futureObservationIds.some((id) => thesis.observationIds.includes(id))) readinessReasons.push("The thesis includes observations after its as-of time.");
  if (duplicateObservationIds.length > 0) readinessReasons.push("Duplicate observation identifiers prevent independent evidence counting.");
  if (competingChannelIds.length > 0) readinessReasons.push("Competing channels must remain visible before a directional conclusion.");
  if (contradictoryEvidence.length > 0) readinessReasons.push("Contradictory evidence is present.");
  if (thesis.unknowns.length > 0) readinessReasons.push("Some exposure or response conditions remain unknown.");
  const invalid = futureObservationIds.some((id) => thesis.observationIds.includes(id)) || duplicateObservationIds.length > 0;
  const blocked = missingObservationIds.length > 0 || contradictoryEvidence.length > 0;
  const status = invalid ? "invalid" : blocked ? "blocked" : readinessReasons.length > 0 ? "monitoring" : "ready";
  return {
    thesisId: thesis.id,
    asOf: thesis.asOf,
    status,
    readinessReasons,
    path,
    supportingEvidence,
    contradictoryEvidence,
    missingObservationIds,
    futureObservationIds,
    duplicateObservationIds,
    unknowns: thesis.unknowns,
    competingChannelIds,
  };
}
