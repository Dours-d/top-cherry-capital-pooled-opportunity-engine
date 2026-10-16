import { z } from "zod";

import {
  capitalDecisionSchema,
  thesisSchema,
  type CapitalDecision,
  type Thesis,
} from "./transmission";

export const draftStatusSchema = z.enum(["draft", "submitted", "superseded", "archived"]);
export type DraftStatus = z.infer<typeof draftStatusSchema>;

const lineageSchema = z.object({
  draftId: z.string().min(1),
  revision: z.number().int().positive(),
  basedOnRevision: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1).max(160),
  changeSummary: z.string().min(1).max(1000),
});

export const thesisDraftSchema = lineageSchema.extend({
  kind: z.literal("thesis"),
  status: draftStatusSchema,
  thesis: thesisSchema,
});
export type ThesisDraft = z.infer<typeof thesisDraftSchema>;

export const decisionDraftSchema = lineageSchema.extend({
  kind: z.literal("decision"),
  status: draftStatusSchema,
  decision: capitalDecisionSchema,
  rationale: z.string().min(1).max(2000),
  alternatives: z.array(z.string().min(1).max(500)),
  constraints: z.array(z.string().min(1).max(500)),
});
export type DecisionDraft = z.infer<typeof decisionDraftSchema>;

export type Draft = ThesisDraft | DecisionDraft;

export function createThesisDraft(input: {
  draftId: string;
  thesis: Thesis;
  createdAt: string;
  createdBy: string;
  changeSummary?: string;
}): ThesisDraft {
  return thesisDraftSchema.parse({
    kind: "thesis",
    status: "draft",
    draftId: input.draftId,
    revision: 1,
    basedOnRevision: null,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    changeSummary: input.changeSummary ?? "Initial thesis draft",
    thesis: input.thesis,
  });
}

export function createDecisionDraft(input: {
  draftId: string;
  decision: CapitalDecision;
  rationale: string;
  alternatives?: string[];
  constraints?: string[];
  createdAt: string;
  createdBy: string;
  changeSummary?: string;
}): DecisionDraft {
  return decisionDraftSchema.parse({
    kind: "decision",
    status: "draft",
    draftId: input.draftId,
    revision: 1,
    basedOnRevision: null,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    changeSummary: input.changeSummary ?? "Initial capital-decision draft",
    decision: input.decision,
    rationale: input.rationale,
    alternatives: input.alternatives ?? [],
    constraints: input.constraints ?? [],
  });
}

function assertEditable(draft: Draft) {
  if (draft.status !== "draft") {
    throw new Error(`Only draft revisions can be edited; current status is ${draft.status}.`);
  }
}

export function reviseThesisDraft(
  current: ThesisDraft,
  input: {
    thesis: Thesis;
    createdAt: string;
    createdBy: string;
    changeSummary: string;
  },
): ThesisDraft {
  assertEditable(current);
  return thesisDraftSchema.parse({
    ...current,
    revision: current.revision + 1,
    basedOnRevision: current.revision,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    changeSummary: input.changeSummary,
    thesis: input.thesis,
  });
}

export function reviseDecisionDraft(
  current: DecisionDraft,
  input: {
    decision: CapitalDecision;
    rationale: string;
    alternatives?: string[];
    constraints?: string[];
    createdAt: string;
    createdBy: string;
    changeSummary: string;
  },
): DecisionDraft {
  assertEditable(current);
  return decisionDraftSchema.parse({
    ...current,
    revision: current.revision + 1,
    basedOnRevision: current.revision,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    changeSummary: input.changeSummary,
    decision: input.decision,
    rationale: input.rationale,
    alternatives: input.alternatives ?? current.alternatives,
    constraints: input.constraints ?? current.constraints,
  });
}

export function transitionDraftStatus(draft: Draft, status: DraftStatus): Draft {
  if (status === draft.status) return draft;
  const allowed: Record<DraftStatus, DraftStatus[]> = {
    draft: ["submitted", "archived"],
    submitted: ["superseded", "archived"],
    superseded: ["archived"],
    archived: [],
  };
  if (!allowed[draft.status].includes(status)) {
    throw new Error(`Invalid draft transition: ${draft.status} -> ${status}.`);
  }
  return draft.kind === "thesis"
    ? thesisDraftSchema.parse({ ...draft, status })
    : decisionDraftSchema.parse({ ...draft, status });
}

export function assertDraftLineage(revisions: Draft[]): void {
  const ordered = [...revisions].sort((a, b) => a.revision - b.revision);
  ordered.forEach((draft, index) => {
    if (index === 0) {
      if (draft.basedOnRevision !== null) throw new Error("The first draft revision cannot have a parent revision.");
      return;
    }
    const previous = ordered[index - 1];
    if (draft.draftId !== previous.draftId || draft.kind !== previous.kind) {
      throw new Error("Draft lineage must contain one draft kind and identifier.");
    }
    if (draft.basedOnRevision !== previous.revision || draft.revision !== previous.revision + 1) {
      throw new Error("Draft revisions must form a contiguous parent chain.");
    }
  });
}
