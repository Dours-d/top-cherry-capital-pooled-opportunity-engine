export type EvidenceExportAuditAction = "copied" | "shared";
export type EvidenceExportFormat = "json" | "markdown";
export type EvidenceExportPrivacyMode = "redacted" | "full";

export type EvidenceExportAuditRecord = {
  exportId: string;
  action: EvidenceExportAuditAction;
  format: EvidenceExportFormat;
  privacyMode: EvidenceExportPrivacyMode;
  keepTitles: boolean;
  keepContext: boolean;
  scopeLabel: string;
  eventCount: number;
  occurredAt: string;
};

export function buildEvidenceExportAudit(input: Omit<EvidenceExportAuditRecord, "exportId"> & { exportId?: string }): EvidenceExportAuditRecord {
  const occurredAt = new Date(input.occurredAt).toISOString();
  return {
    exportId: input.exportId ?? `${input.action}:${occurredAt}:${input.format}`,
    action: input.action,
    format: input.format,
    privacyMode: input.privacyMode,
    keepTitles: input.privacyMode === "redacted" && input.keepTitles,
    keepContext: input.privacyMode === "redacted" && input.keepContext,
    scopeLabel: input.scopeLabel,
    eventCount: Math.max(0, Math.trunc(input.eventCount)),
    occurredAt,
  };
}

export function mergeEvidenceExportAudits(existing: readonly EvidenceExportAuditRecord[], incoming: readonly EvidenceExportAuditRecord[]) {
  const byId = new Map(existing.map((audit) => [audit.exportId, audit]));
  for (const audit of incoming) byId.set(audit.exportId, audit);
  return [...byId.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
