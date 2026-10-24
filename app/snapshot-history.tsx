import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { formatCurrency } from "@/lib/market-data";
import { trpc } from "@/lib/trpc";
import { buildEvidencePackage, renderEvidencePackageMarkdown } from "@/shared/evidence-package";
import { compareCurrentProviderReadToSnapshot, compareSnapshotToPrior, evaluateEbayItemDetailCoverage, evaluateSnapshotReconciliation, getSnapshotFreshness, summarizeSnapshotSourceQuality } from "@/shared/reconciliation-snapshots";

type Snapshot = {
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

export default function SnapshotHistoryScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { providerListingId, title, profileSlug } = useLocalSearchParams<{ providerListingId?: string; title?: string; profileSlug?: string }>();
  const snapshotsQuery = trpc.reconciliationSnapshots.list.useQuery(undefined, { enabled: isAuthenticated });
  const characteristicAudits = trpc.reconciliationSnapshots.characteristicCheckAudits.useQuery({ providerListingId }, { enabled: isAuthenticated && Boolean(providerListingId), staleTime: 30_000 });
  const snapshots = ((snapshotsQuery.data ?? []) as Snapshot[])
    .filter((snapshot) => snapshot.providerListingId === providerListingId)
    .sort((a, b) => new Date(b.sourceFetchedAt).getTime() - new Date(a.sourceFetchedAt).getTime());
  const current = snapshots[0];
  const comparison = current ? compareSnapshotToPrior(current, snapshots) : null;
  const attentionCount = snapshots.filter((snapshot) => evaluateSnapshotReconciliation(snapshot).state === "needs-attention").length;
  const characteristicCoverage = evaluateEbayItemDetailCoverage(current ? { itemId: current.providerListingId, title: current.title, askingPrice: current.askingPrice, condition: current.condition, fetchedAt: String(current.sourceFetchedAt), profileSlug, localizedAspects: [] } : null);
  const currentProviderDetail = trpc.marketplace.getEbayItem.useQuery({ itemId: current?.providerListingId ?? "pending", marketplaceId: current?.marketplaceId ?? "EBAY_GB" }, { enabled: isAuthenticated && Boolean(current), staleTime: 0 });
  const currentReadComparison = current && currentProviderDetail.data ? compareCurrentProviderReadToSnapshot({ providerPrice: currentProviderDetail.data.askingPrice, providerCurrency: currentProviderDetail.data.currency, persistedPrice: current.askingPrice, persistedCurrency: current.currency }) : null;
  const timelineSnapshots = current?.currency ? [...snapshots].filter((snapshot) => snapshot.currency === current.currency).reverse() : [];
  const timelineMax = Math.max(...timelineSnapshots.map((snapshot) => snapshot.askingPrice), 0);
  const sourceQuality = summarizeSnapshotSourceQuality(snapshots);
  const missingQualityFields = Object.entries(sourceQuality.missingCounts).filter(([, count]) => count > 0).map(([field, count]) => `${field} (${count})`);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const shareEvidencePackage = async (format: "json" | "markdown") => {
    const payload = buildEvidencePackage({
      exportedAt: new Date().toISOString(),
      scope: { providerListingId, title: title ?? current?.title ?? null, profileSlug: profileSlug ?? null },
      sourceQuality,
      snapshots,
      currentProviderRead: currentProviderDetail.data ? { itemId: currentProviderDetail.data.itemId, askingPrice: currentProviderDetail.data.askingPrice, currency: currentProviderDetail.data.currency, fetchedAt: currentProviderDetail.data.fetchedAt, localizedAspects: currentProviderDetail.data.localizedAspects } : null,
      characteristicAudits: characteristicAudits.data ?? [],
    });
    try {
      await Share.share({ title: `Top Cherry evidence package (${format.toUpperCase()})`, message: format === "json" ? JSON.stringify(payload, null, 2) : renderEvidencePackageMarkdown(payload) });
      setShareStatus(`${format.toUpperCase()} evidence package prepared for sharing.`);
    } catch {
      setShareStatus("Sharing is unavailable on this device; the persisted evidence remains unchanged.");
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <MaterialIcons name="arrow-back" size={20} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Workspace</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>R2.0 · OBSERVATION HISTORY</Text>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={3}>{title ?? current?.title ?? "Provider listing"}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{providerListingId ?? "No provider listing selected"}</Text>
        <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.noticeTitle, { color: colors.foreground }]}>Evidence timeline only</Text>
          <Text style={[styles.noticeText, { color: colors.muted }]}>Each row is a provider fetch observation. A repeated listing, price movement or stale record does not prove physical stock, a sale, demand, fair value or allocation eligibility.</Text>
        </View>
        {!isAuthenticated ? <Text style={[styles.empty, { color: colors.muted }]}>Sign in to view persisted observation history.</Text> : snapshotsQuery.isLoading ? <Text style={[styles.empty, { color: colors.muted }]}>Loading persisted observations…</Text> : !snapshots.length ? <Text style={[styles.empty, { color: colors.muted }]}>No persisted observations for this provider listing.</Text> : <>
          <View style={styles.summaryRow}>
            <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{snapshots.length}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>Fetches</Text></View>
            <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: comparison?.state === "increased" ? colors.warning : comparison?.state === "decreased" ? colors.success : colors.foreground }]}>{comparison?.state === "unknown" ? "—" : comparison?.state === "unchanged" ? "=" : comparison?.state === "increased" ? "↑" : "↓"}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>Ask movement</Text></View>
            <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{current ? getSnapshotFreshness(current.sourceFetchedAt).state : "—"}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>Freshness</Text></View>
          </View>
          <Text style={[styles.qualitySummary, { color: attentionCount ? colors.warning : colors.success }]}>{attentionCount ? `${attentionCount} observation${attentionCount === 1 ? "" : "s"} need provider-field attention.` : "Provider-required fields are present for every stored observation."} This is a data-quality check only.</Text>
          <Text style={[styles.qualitySummary, { color: colors.muted }]}>{profileSlug ? `Profile characteristic prompts: ${characteristicCoverage.recommendedMissing.join(", ") || "none recorded"}.` : "No profile context was stored for this history route; profile-specific characteristic prompts remain unknown."} These prompts do not establish authenticity, value, stock or allocation eligibility.</Text>
          <Text style={[styles.qualitySummary, { color: snapshots.every((snapshot) => snapshot.characteristicsChecked) ? colors.success : colors.warning }]}>{snapshots.filter((snapshot) => snapshot.characteristicsChecked).length} of {snapshots.length} observations marked characteristics checked. This is an operator acknowledgment, not provider verification.</Text>
          <View style={[styles.qualityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.auditTitle, { color: colors.foreground }]}>Source quality</Text>
            <Text style={[styles.auditIntro, { color: colors.muted }]}>A completeness and age summary of the persisted provider observations. Missing fields remain unknown; they are not reconstructed from titles, prices or assumptions.</Text>
            <Text style={[styles.qualityLine, { color: colors.foreground }]}>Age: {sourceQuality.ageCounts.fresh} fresh · {sourceQuality.ageCounts.aging} aging · {sourceQuality.ageCounts.stale} stale · {sourceQuality.ageCounts.unknown} unknown</Text>
            <Text style={[styles.qualityLine, { color: missingQualityFields.length ? colors.warning : colors.success }]}>{missingQualityFields.length ? `Missing fields: ${missingQualityFields.join(", ")}` : "No tracked provider fields are missing."}</Text>
            <Text style={[styles.qualityFootnote, { color: colors.muted }]}>Age and completeness are data-quality prompts only. They do not estimate availability, demand, market value, sale probability or allocation suitability.</Text>
          </View>
          <View style={[styles.exportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.exportHeader}><View style={styles.refreshCopy}><Text style={[styles.auditTitle, { color: colors.foreground }]}>Evidence package</Text><Text style={[styles.auditIntro, { color: colors.muted }]}>Share snapshots, provenance, source quality, current provider read and characteristic audits as a research record. No valuation, execution or custody fields are exported.</Text></View><View style={styles.exportActions}><Pressable onPress={() => void shareEvidencePackage("json")} style={({ pressed }) => [styles.refreshButton, { borderColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.refreshButtonText, { color: colors.primary }]}>JSON</Text></Pressable><Pressable onPress={() => void shareEvidencePackage("markdown")} style={({ pressed }) => [styles.refreshButton, { borderColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.refreshButtonText, { color: colors.primary }]}>Markdown</Text></Pressable></View></View>
            {shareStatus ? <Text style={[styles.qualityFootnote, { color: colors.muted }]}>{shareStatus}</Text> : null}
          </View>
          <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.auditTitle, { color: colors.foreground }]}>Asking-price timeline</Text>
            <Text style={[styles.auditIntro, { color: colors.muted }]}>Persisted observations in {current?.currency ?? "an unknown currency"}, oldest first. Bar length is relative within this listing history; it is not a fair-value estimate.</Text>
            {!timelineSnapshots.length ? <Text style={[styles.auditEmpty, { color: colors.muted }]}>No currency-matched observations are available for a timeline.</Text> : timelineSnapshots.map((snapshot) => <View key={`timeline-${snapshot.snapshotId}`} style={styles.timelineRow}><View style={styles.timelineMeta}><Text style={[styles.timelineDate, { color: colors.muted }]}>{new Date(snapshot.sourceFetchedAt).toLocaleDateString()}</Text><Text style={[styles.timelinePrice, { color: colors.foreground }]}>{formatCurrency(snapshot.askingPrice, snapshot.currency ?? undefined)}</Text></View><View style={[styles.timelineTrack, { backgroundColor: colors.border }]}><View style={[styles.timelineBar, { backgroundColor: colors.primary, width: `${timelineMax ? Math.max(4, (snapshot.askingPrice / timelineMax) * 100) : 4}%` }]} /></View></View>)}
            <Text style={[styles.timelineFootnote, { color: colors.muted }]}>This describes recorded asking-price observations only. It does not establish a sale, stock count, demand, market value or allocation recommendation.</Text>
          </View>
          <View style={[styles.refreshCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.refreshHeader}><View style={styles.refreshCopy}><Text style={[styles.auditTitle, { color: colors.foreground }]}>Current provider refresh</Text><Text style={[styles.auditIntro, { color: colors.muted }]}>Optional live read of the provider item-detail endpoint. It is not written into the historical timeline until you save a new reconciliation snapshot.</Text></View><Pressable onPress={() => void currentProviderDetail.refetch()} disabled={currentProviderDetail.isFetching} style={({ pressed }) => [styles.refreshButton, { borderColor: colors.primary }, currentProviderDetail.isFetching && styles.disabled, pressed && styles.pressed]}><Text style={[styles.refreshButtonText, { color: colors.primary }]}>{currentProviderDetail.isFetching ? "Reading…" : "Refresh"}</Text></Pressable></View>
            {currentProviderDetail.data ? <><Text style={[styles.refreshResult, { color: colors.muted }]}>Provider returned {formatCurrency(currentProviderDetail.data.askingPrice, currentProviderDetail.data.currency)} · {currentProviderDetail.data.localizedAspects?.length ?? 0} characteristic groups · fetched {new Date(currentProviderDetail.data.fetchedAt).toLocaleString()}. This remains an asking-price/provider-field observation only.</Text>{currentReadComparison?.state === "unknown" ? <Text style={[styles.refreshComparison, { color: colors.warning }]}>{currentReadComparison.reason === "currency-mismatch" ? "Movement not comparable: provider and persisted currencies differ." : currentReadComparison.reason === "missing-currency" ? "Movement not comparable: currency is missing from one side." : "Movement not comparable: asking price is missing."} No conversion or valuation is inferred.</Text> : <Text style={[styles.refreshComparison, { color: currentReadComparison?.state === "increased" ? colors.warning : currentReadComparison?.state === "decreased" ? colors.success : colors.muted }]}>{currentReadComparison?.state === "unchanged" ? "Current provider asking price matches the persisted snapshot." : `${currentReadComparison?.state === "increased" ? "Current provider asking price increased" : "Current provider asking price decreased"} by ${formatCurrency(Math.abs(currentReadComparison?.delta ?? 0), currentReadComparison?.currency)}.`} Asking-price movement only; not a sale or market-value signal.</Text>}</> : currentProviderDetail.isError ? <Text style={[styles.refreshResult, { color: colors.warning }]}>Current provider read unavailable. Historical observations remain unchanged; no disappearance or error is treated as a sale or stock signal.</Text> : <Text style={[styles.refreshResult, { color: colors.muted }]}>No current provider read requested yet.</Text>}
          </View>
          <View style={[styles.auditCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.auditTitle, { color: colors.foreground }]}>Characteristic-check audit timeline</Text>
            <Text style={[styles.auditIntro, { color: colors.muted }]}>Every check is appended as a separate event. Earlier notes are never overwritten; repeated checks are shown as rechecks.</Text>
            {!characteristicAudits.data?.length ? <Text style={[styles.auditEmpty, { color: colors.muted }]}>{characteristicAudits.isLoading ? "Loading audit events…" : "No characteristic-check events recorded for this provider listing."}</Text> : characteristicAudits.data.map((audit) => <View key={audit.auditId} style={[styles.auditEvent, { borderTopColor: colors.border }]}><View style={styles.auditEventHeader}><Text style={[styles.auditAction, { color: audit.action === "rechecked" ? colors.primary : colors.success }]}>{audit.action === "rechecked" ? "RECHECKED" : "CHECKED"}</Text><Text style={[styles.auditDate, { color: colors.muted }]}>{new Date(audit.occurredAt).toLocaleString()}</Text></View><Text style={[styles.auditNote, { color: colors.foreground }]}>“{audit.note}”</Text><Text style={[styles.auditId, { color: colors.muted }]}>Audit {audit.auditId}</Text></View>)}
          </View>
          {snapshots.map((snapshot, index) => {
            const freshness = getSnapshotFreshness(snapshot.sourceFetchedAt);
            const movement = compareSnapshotToPrior(snapshot, snapshots);
            const reconciliation = evaluateSnapshotReconciliation(snapshot);
            return <View key={snapshot.snapshotId} style={[styles.historyRow, { borderTopColor: colors.border }]}>
              <View style={styles.historyMarker}><View style={[styles.dot, { backgroundColor: index === 0 ? colors.primary : colors.border }]} />{index < snapshots.length - 1 ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}</View>
              <View style={styles.historyBody}>
                <View style={styles.historyHeader}><Text style={[styles.date, { color: colors.foreground }]}>{new Date(snapshot.sourceFetchedAt).toLocaleString()}</Text><Text style={[styles.status, { color: snapshot.reconciliationStatus === "superseded" ? colors.warning : snapshot.reconciliationStatus === "reviewed" ? colors.success : colors.muted }]}>{snapshot.reconciliationStatus.toUpperCase()}</Text></View>
                <Text style={[styles.price, { color: colors.foreground }]}>{formatCurrency(snapshot.askingPrice, snapshot.currency ?? undefined)}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>{snapshot.marketplaceId} · {snapshot.condition}{snapshot.location ? ` · ${snapshot.location}` : ""}</Text>
                <Text style={[styles.freshness, { color: freshness.state === "stale" ? colors.warning : freshness.state === "fresh" ? colors.success : colors.muted }]}>{freshness.state === "unknown" ? "Age unknown" : `${freshness.state} observation`} · quality prompt only</Text>
                <Text style={[styles.quality, { color: reconciliation.state === "ready" ? colors.success : colors.warning }]}>{reconciliation.state === "ready" ? "Provider fields ready" : `Provider fields need attention: ${reconciliation.requiredMissing.join(", ")}`}{reconciliation.recommendedMissing.length ? ` · recommended missing: ${reconciliation.recommendedMissing.join(", ")}` : ""}</Text>
                <Text style={[styles.quality, { color: snapshot.characteristicsChecked ? colors.success : colors.warning }]}>{snapshot.characteristicsChecked ? `Characteristics checked${snapshot.characteristicsCheckedAt ? ` · ${new Date(snapshot.characteristicsCheckedAt).toLocaleString()}` : ""}` : "Characteristics not checked"} · acknowledgment only</Text>
                <Text style={[styles.movement, { color: movement.state === "increased" ? colors.warning : movement.state === "decreased" ? colors.success : colors.muted }]}>{movement.state === "unknown" ? "No currency-matched prior observation" : movement.state === "unchanged" ? "No asking-price movement" : `${movement.state === "increased" ? "Increased" : "Decreased"} by ${formatCurrency(Math.abs(movement.delta ?? 0), movement.currency)}`}. Not a sale signal.</Text>
                {snapshot.characteristicsCheckNote ? <Text style={[styles.note, { color: colors.foreground }]}>Characteristic note: “{snapshot.characteristicsCheckNote}”</Text> : null}
                {snapshot.reviewNote ? <Text style={[styles.note, { color: colors.foreground }]}>“{snapshot.reviewNote}”</Text> : null}
              </View>
            </View>;
          })}
        </>}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  back: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  backText: { fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 8 },
  subtitle: { fontSize: 12, marginTop: 8 },
  notice: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 20 },
  noticeTitle: { fontSize: 14, fontWeight: "800" },
  noticeText: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  empty: { fontSize: 14, lineHeight: 20, marginTop: 24 },
  summaryRow: { flexDirection: "row", gap: 8, marginTop: 20 },
  metric: { flex: 1, minHeight: 74, borderWidth: 1, borderRadius: 14, padding: 12 },
  metricValue: { fontSize: 19, fontWeight: "900" },
  metricLabel: { fontSize: 10, marginTop: 5 },
  qualitySummary: { fontSize: 11, lineHeight: 16, marginTop: 12 },
  qualityCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  qualityLine: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  qualityFootnote: { fontSize: 10, lineHeight: 14, marginTop: 10 },
  exportCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  exportHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  exportActions: { gap: 6, alignItems: "flex-end" },
  timelineCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  timelineRow: { marginTop: 12 },
  timelineMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timelineDate: { fontSize: 10 },
  timelinePrice: { fontSize: 11, fontWeight: "800" },
  timelineTrack: { height: 7, borderRadius: 4, overflow: "hidden", marginTop: 5 },
  timelineBar: { height: 7, borderRadius: 4 },
  timelineFootnote: { fontSize: 10, lineHeight: 14, marginTop: 12 },
  historyRow: { flexDirection: "row", gap: 12, paddingTop: 16, marginTop: 4, borderTopWidth: 1 },
  historyMarker: { width: 12, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line: { width: 1, flex: 1, marginTop: 4, minHeight: 100 },
  historyBody: { flex: 1, paddingBottom: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  date: { flex: 1, fontSize: 12, fontWeight: "700" },
  status: { fontSize: 10, fontWeight: "800" },
  price: { fontSize: 22, fontWeight: "900", marginTop: 8 },
  meta: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  freshness: { fontSize: 11, fontWeight: "700", marginTop: 7 },
  quality: { fontSize: 11, lineHeight: 16, marginTop: 4, fontWeight: "700" },
  movement: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 7 },
  auditCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  auditTitle: { fontSize: 14, fontWeight: "800" },
  auditIntro: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  auditEmpty: { fontSize: 11, lineHeight: 16, marginTop: 10 },
  auditEvent: { borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  auditEventHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  auditAction: { fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  auditDate: { fontSize: 10 },
  auditNote: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  auditId: { fontSize: 9, lineHeight: 13, marginTop: 5 },
  refreshCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  refreshHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  refreshCopy: { flex: 1 },
  refreshButton: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  refreshButtonText: { fontSize: 10, fontWeight: "800" },
  refreshResult: { fontSize: 11, lineHeight: 16, marginTop: 10 },
  refreshComparison: { fontSize: 11, lineHeight: 16, marginTop: 6, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
