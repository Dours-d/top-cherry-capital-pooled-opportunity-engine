import type { SourceQualitySummary } from "./reconciliation-snapshots";

type SnapshotInput = {
  snapshotId: string;
  marketplaceId: string;
  providerListingId: string;
  profileSlug: string;
  title: string;
  askingPrice: number;
  currency: string | null;
  condition: string;
  location: string | null;
  sellerId: string | null;
  sourceFetchedAt: Date | string;
  reconciliationStatus: "observed" | "reviewed" | "superseded";
  reviewNote: string | null;
  reviewedAt: Date | string | null;
  characteristicsChecked: boolean;
  characteristicsCheckedAt: Date | string | null;
  characteristicsCheckNote: string | null;
};

type ProviderReadInput = {
  itemId: string;
  askingPrice: number | undefined;
  currency: string | null | undefined;
  fetchedAt: Date | string;
  localizedAspects?: unknown[];
};

type CharacteristicAuditInput = {
  auditId: string;
  action: "checked" | "rechecked";
  occurredAt: Date | string;
  note: string;
};

type RetryResetAuditInput = {
  resetId: string;
  providerListingId: string;
  previousAttemptCount: number;
  occurredAt: Date | string;
  note: string;
  syncStatus: "account-synced" | "pending-local";
};

export function buildEvidencePackage(input: {
  exportedAt: string;
  scope: { providerListingId?: string; title?: string | null; profileSlug?: string | null };
  sourceQuality: SourceQualitySummary;
  snapshots: SnapshotInput[];
  currentProviderRead?: ProviderReadInput | null;
  characteristicAudits: CharacteristicAuditInput[];
  retryResetAudits?: RetryResetAuditInput[];
}) {
  return {
    schemaVersion: "top-cherry-evidence-1",
    exportedAt: input.exportedAt,
    scope: input.scope,
    semantics: "Research evidence only. Asking prices and provider fields do not establish sale, stock, demand, fair value, authenticity, allocation eligibility or execution authority.",
    sourceQuality: input.sourceQuality,
    snapshots: input.snapshots.map((snapshot) => ({
      snapshotId: snapshot.snapshotId,
      marketplaceId: snapshot.marketplaceId,
      providerListingId: snapshot.providerListingId,
      profileSlug: snapshot.profileSlug,
      title: snapshot.title,
      askingPrice: snapshot.askingPrice,
      currency: snapshot.currency,
      condition: snapshot.condition,
      location: snapshot.location,
      sellerId: snapshot.sellerId,
      sourceFetchedAt: snapshot.sourceFetchedAt,
      reconciliationStatus: snapshot.reconciliationStatus,
      reviewNote: snapshot.reviewNote,
      reviewedAt: snapshot.reviewedAt,
      characteristicsChecked: snapshot.characteristicsChecked,
      characteristicsCheckedAt: snapshot.characteristicsCheckedAt,
      characteristicsCheckNote: snapshot.characteristicsCheckNote,
    })),
    currentProviderRead: input.currentProviderRead ? {
      itemId: input.currentProviderRead.itemId,
      askingPrice: input.currentProviderRead.askingPrice,
      currency: input.currentProviderRead.currency,
      fetchedAt: input.currentProviderRead.fetchedAt,
      characteristicGroupCount: input.currentProviderRead.localizedAspects?.length ?? 0,
    } : null,
    characteristicAudits: input.characteristicAudits.map((audit) => ({
      auditId: audit.auditId,
      action: audit.action,
      occurredAt: audit.occurredAt,
      note: audit.note,
    })),
    retryResetAudits: (input.retryResetAudits ?? []).map((audit) => ({
      resetId: audit.resetId,
      providerListingId: audit.providerListingId,
      previousAttemptCount: audit.previousAttemptCount,
      occurredAt: audit.occurredAt,
      note: audit.note,
      syncStatus: audit.syncStatus,
    })),
  };
}

export type EvidencePackage = ReturnType<typeof buildEvidencePackage>;

export function redactEvidencePackage(pkg: EvidencePackage): EvidencePackage {
  const redacted = "[redacted]";
  return {
    ...pkg,
    scope: {
      ...pkg.scope,
      providerListingId: pkg.scope.providerListingId ? redacted : pkg.scope.providerListingId,
      title: pkg.scope.title ? redacted : pkg.scope.title,
    },
    snapshots: pkg.snapshots.map((snapshot) => ({
      ...snapshot,
      snapshotId: redacted,
      providerListingId: redacted,
      title: redacted,
      sellerId: snapshot.sellerId ? redacted : snapshot.sellerId,
      reviewNote: snapshot.reviewNote ? redacted : snapshot.reviewNote,
      characteristicsCheckNote: snapshot.characteristicsCheckNote ? redacted : snapshot.characteristicsCheckNote,
    })),
    currentProviderRead: pkg.currentProviderRead ? { ...pkg.currentProviderRead, itemId: redacted } : null,
    characteristicAudits: pkg.characteristicAudits.map((audit) => ({ ...audit, auditId: redacted, note: redacted })),
    retryResetAudits: pkg.retryResetAudits.map((audit) => ({ ...audit, resetId: redacted, providerListingId: redacted, note: redacted })),
  };
}

export function buildEvidenceFilename(providerListingId: string | undefined, format: "json" | "markdown") {
  const token = (providerListingId ?? "listing").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "listing";
  return `top-cherry-${token}-evidence.${format === "markdown" ? "md" : "json"}`;
}

function markdownCell(value: unknown) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderEvidencePackageMarkdown(pkg: EvidencePackage) {
  const scope = pkg.scope;
  const rows = pkg.snapshots.map((snapshot) => `| ${markdownCell(snapshot.sourceFetchedAt)} | ${markdownCell(snapshot.askingPrice)} ${markdownCell(snapshot.currency)} | ${markdownCell(snapshot.reconciliationStatus)} | ${snapshot.characteristicsChecked ? "checked" : "not checked"} |`).join("\n") || "| — | — | — | — |";
  const audits = pkg.characteristicAudits.map((audit) => `- **${markdownCell(audit.action)}** ${markdownCell(audit.occurredAt)} — ${markdownCell(audit.note)} (${markdownCell(audit.auditId)})`).join("\n") || "- No characteristic-check audit events recorded.";
  const retryResets = pkg.retryResetAudits.map((audit) => `- **${markdownCell(audit.syncStatus)}** ${markdownCell(audit.occurredAt)} — ${markdownCell(audit.providerListingId)} reopened after ${markdownCell(audit.previousAttemptCount)} attempt(s): ${markdownCell(audit.note)} (${markdownCell(audit.resetId)})`).join("\n") || "- No provider-read retry-reset audit events recorded.";
  const currentRead = pkg.currentProviderRead ? `${markdownCell(pkg.currentProviderRead.askingPrice)} ${markdownCell(pkg.currentProviderRead.currency)}; ${pkg.currentProviderRead.characteristicGroupCount} characteristic groups; fetched ${markdownCell(pkg.currentProviderRead.fetchedAt)}` : "No current provider read included.";
  return `# Top Cherry evidence package\n\n- Schema: ${pkg.schemaVersion}\n- Exported: ${pkg.exportedAt}\n- Provider listing: ${markdownCell(scope.providerListingId)}\n- Title: ${markdownCell(scope.title)}\n- Profile: ${markdownCell(scope.profileSlug)}\n\n> ${pkg.semantics}\n\n## Source quality\n\n- Fresh: ${pkg.sourceQuality.ageCounts.fresh}\n- Aging: ${pkg.sourceQuality.ageCounts.aging}\n- Stale: ${pkg.sourceQuality.ageCounts.stale}\n- Unknown: ${pkg.sourceQuality.ageCounts.unknown}\n\n## Persisted observations\n\n| Fetched | Asking price | Status | Characteristics |\n|---|---:|---|---|\n${rows}\n\n## Current provider read\n\n${currentRead}\n\n## Characteristic-check audit\n\n${audits}\n\n## Provider-read retry-reset audit\n\n${retryResets}\n\n## Boundary\n\nThis is a research record of provider observations and operator acknowledgments. It is not a valuation, sale record, stock confirmation, execution instruction, custody record or pooled-fund decision.\n`;
}
