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

export function buildEvidencePackage(input: {
  exportedAt: string;
  scope: { providerListingId?: string; title?: string | null; profileSlug?: string | null };
  sourceQuality: SourceQualitySummary;
  snapshots: SnapshotInput[];
  currentProviderRead?: ProviderReadInput | null;
  characteristicAudits: CharacteristicAuditInput[];
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
  };
}
