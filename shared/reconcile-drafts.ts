import { assertDraftLineage, type ThesisDraft } from "./versioned-drafts";

export type DraftReconciliation =
  | { status: "local-only"; store: { revisions: ThesisDraft[]; current: ThesisDraft } }
  | { status: "remote-only"; store: { revisions: ThesisDraft[]; current: ThesisDraft } }
  | { status: "merged"; store: { revisions: ThesisDraft[]; current: ThesisDraft } }
  | { status: "conflict"; local: ThesisDraft; remote: ThesisDraft };

export function reconcileThesisDrafts(local: ThesisDraft[], remote: ThesisDraft[]): DraftReconciliation {
  const all = [...local, ...remote].sort((a, b) => a.revision - b.revision);
  const byRevision = new Map<number, ThesisDraft>();
  for (const draft of all) {
    const existing = byRevision.get(draft.revision);
    if (existing && JSON.stringify(existing) !== JSON.stringify(draft)) return { status: "conflict", local: existing, remote: draft };
    byRevision.set(draft.revision, draft);
  }
  const revisions = [...byRevision.values()];
  assertDraftLineage(revisions);
  const current = revisions[revisions.length - 1];
  return { status: local.length === 0 ? "remote-only" : remote.length === 0 ? "local-only" : "merged", store: { revisions, current } };
}

export function canAllocateCandidate(input: {
  thesisStatus: "ready" | "monitoring" | "blocked" | "invalid";
  candidateVerified: boolean;
  escrowProtected: boolean;
  netUpside: number;
  budget: number;
  askingPrice: number;
  reserve: number;
}) {
  return input.thesisStatus === "ready" && input.candidateVerified && input.escrowProtected && input.netUpside > 0 && input.askingPrice + input.reserve <= input.budget;
}
