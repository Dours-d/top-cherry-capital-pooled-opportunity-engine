export type EvidenceExportAuditAction = "copied" | "shared";
export type EvidenceExportFormat = "json" | "markdown";
export type EvidenceExportPrivacyMode = "redacted" | "full";
export type EvidenceExportAuditWindow = "all" | "7d" | "30d";

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

export function recentEvidenceExportAudits(audits: readonly EvidenceExportAuditRecord[], limit = 5) {
  return [...audits].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, Math.max(0, limit));
}

export function filterEvidenceExportAuditsByWindow(audits: readonly EvidenceExportAuditRecord[], window: EvidenceExportAuditWindow, now: string | Date = new Date()) {
  if (window === "all") return [...audits];
  const cutoff = new Date(now).getTime() - (window === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000;
  return audits.filter((audit) => new Date(audit.occurredAt).getTime() >= cutoff);
}
