import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { formatCurrency } from "@/lib/market-data";
import { trpc } from "@/lib/trpc";
import { compareSnapshotToPrior, evaluateEbayItemDetailCoverage, evaluateSnapshotReconciliation, getSnapshotFreshness } from "@/shared/reconciliation-snapshots";

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
};

export default function SnapshotHistoryScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { providerListingId, title, profileSlug } = useLocalSearchParams<{ providerListingId?: string; title?: string; profileSlug?: string }>();
  const snapshotsQuery = trpc.reconciliationSnapshots.list.useQuery(undefined, { enabled: isAuthenticated });
  const snapshots = ((snapshotsQuery.data ?? []) as Snapshot[])
    .filter((snapshot) => snapshot.providerListingId === providerListingId)
    .sort((a, b) => new Date(b.sourceFetchedAt).getTime() - new Date(a.sourceFetchedAt).getTime());
  const current = snapshots[0];
  const comparison = current ? compareSnapshotToPrior(current, snapshots) : null;
  const attentionCount = snapshots.filter((snapshot) => evaluateSnapshotReconciliation(snapshot).state === "needs-attention").length;
  const characteristicCoverage = evaluateEbayItemDetailCoverage(current ? { itemId: current.providerListingId, title: current.title, askingPrice: current.askingPrice, condition: current.condition, fetchedAt: String(current.sourceFetchedAt), profileSlug, localizedAspects: [] } : null);

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
                <Text style={[styles.movement, { color: movement.state === "increased" ? colors.warning : movement.state === "decreased" ? colors.success : colors.muted }]}>{movement.state === "unknown" ? "No currency-matched prior observation" : movement.state === "unchanged" ? "No asking-price movement" : `${movement.state === "increased" ? "Increased" : "Decreased"} by ${formatCurrency(Math.abs(movement.delta ?? 0), movement.currency)}`}. Not a sale signal.</Text>
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
});
