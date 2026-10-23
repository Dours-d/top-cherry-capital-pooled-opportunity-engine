import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatCurrency, getEbaySearchTerm, getListingRedundancySummary, mapLiveEbayListings, PROFILES } from "@/lib/market-data";
import type { Listing, LiveEbayItemDetail } from "@/lib/market-data";
import { buildEbayReconciliationSnapshot, evaluateEbayItemDetailCoverage } from "@/shared/reconciliation-snapshots";

export default function ReconcileScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [activeSlug, setActiveSlug] = useState(PROFILES[0].slug);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const searchTerm = query.trim() || getEbaySearchTerm(activeSlug);
  const browse = trpc.marketplace.searchEbay.useQuery(
    { query: searchTerm, marketplaceId: "EBAY_GB", limit: 20, offset },
    { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  );
  const itemDetail = trpc.marketplace.getEbayItem.useQuery(
    { itemId: selectedItemId ?? "disabled-item", marketplaceId: "EBAY_GB" },
    { enabled: Boolean(selectedItemId), staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  );
  const snapshots = trpc.reconciliationSnapshots.list.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const saveSnapshot = trpc.reconciliationSnapshots.upsert.useMutation();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const listings = useMemo(
    () => mapLiveEbayListings((browse.data?.listings ?? []).map((listing) => ({ ...listing, profileSlug: activeSlug }))),
    [activeSlug, browse.data?.listings],
  );
  const redundancy = getListingRedundancySummary(listings);

  const selectProfile = (slug: string) => {
    setActiveSlug(slug);
    setOffset(0);
    setQuery("");
  };

  const saveCurrentSnapshot = async () => {
    if (!isAuthenticated || !browse.data?.listings.length) return;
    setSaveState("saving");
    try {
      for (const listing of browse.data.listings) {
        await saveSnapshot.mutateAsync(buildEbayReconciliationSnapshot({ listing, marketplaceId: browse.data.marketplaceId, query: searchTerm, profileSlug: activeSlug, sourceFetchedAt: browse.data.fetchedAt }));
      }
      await snapshots.refetch();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>R2 RECONCILIATION</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Inspect the source.</Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>Normalize live rows before they become research evidence.</Text>
              </View>
              <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}><MaterialIcons name="sync" size={22} color={colors.onPrimary} /></View>
            </View>

            <View style={styles.profileRail}>
              {PROFILES.map((profile) => (
                <Pressable key={profile.slug} onPress={() => selectProfile(profile.slug)} style={({ pressed }) => [styles.profileChip, { backgroundColor: activeSlug === profile.slug ? colors.primary : colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                  <Text style={[styles.profileChipText, { color: activeSlug === profile.slug ? colors.onPrimary : colors.foreground }]}>{profile.shortName}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={20} color={colors.muted} />
              <TextInput value={query} onChangeText={(value) => { setQuery(value); setOffset(0); }} placeholder="Override provider search" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} returnKeyType="search" />
              {query ? <Pressable onPress={() => { setQuery(""); setOffset(0); }}><MaterialIcons name="close" size={19} color={colors.muted} /></Pressable> : null}
            </View>

            <View style={[styles.boundaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.boundaryTitle}><MaterialIcons name="fact-check" size={18} color={colors.primary} /><Text style={[styles.boundaryHeading, { color: colors.foreground }]}>What reconciliation means here</Text></View>
              <Text style={[styles.boundaryText, { color: colors.muted }]}>This pass records what the provider returned, when it returned it, and how rows provisionally cluster. It does not establish stock, fair value, demand, realized resale, or an allocation decision.</Text>
              <Text style={[styles.boundaryText, { color: colors.muted }]}>Source: eBay Browse · marketplace: EBAY_GB · query: {searchTerm}</Text>
              <Text style={[styles.boundaryText, { color: colors.muted }]}>Profile characteristic prompts: {evaluateEbayItemDetailCoverage({ profileSlug: activeSlug, localizedAspects: [] }).recommendedMissing.join(", ") || "none configured"}. These fields are research prompts only and are stored separately from provider-required reconciliation fields.</Text>
            </View>

            <View style={styles.metricRow}>
              <Metric label="Raw rows" value={String(redundancy.rawListingCount)} colors={colors} />
              <Metric label="Candidates" value={String(redundancy.candidateItemCount)} colors={colors} />
              <Metric label="Redundant" value={String(redundancy.redundantRows)} colors={colors} />
            </View>
            <View style={[styles.persistenceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.persistenceCopy}><Text style={[styles.persistenceTitle, { color: colors.foreground }]}>Observation snapshot</Text><Text style={[styles.persistenceText, { color: colors.muted }]}>{isAuthenticated ? `${snapshots.data?.length ?? 0} snapshots in your account` : "Sign in to persist this provider page for review"}</Text></View>
              {isAuthenticated ? <Pressable onPress={() => void saveCurrentSnapshot()} disabled={saveState === "saving" || !listings.length} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, (!listings.length || saveState === "saving") && styles.disabled, pressed && styles.pressed]}><Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save page"}</Text></Pressable> : null}
            </View>
            {saveState === "error" ? <Text style={[styles.saveError, { color: colors.error }]}>Some rows could not be persisted. The provider page remains available for retry.</Text> : null}
            {selectedItemId ? <ItemDetailCard detail={(itemDetail.data ?? null) as LiveEbayItemDetail | null} loading={itemDetail.isLoading} error={Boolean(itemDetail.error)} profileSlug={activeSlug} colors={colors} onClose={() => setSelectedItemId(null)} /> : null}

            <View style={styles.metaRow}><Text style={[styles.metaText, { color: colors.muted }]}>{browse.data ? `Fetched ${new Date(browse.data.fetchedAt).toLocaleString()}` : "Waiting for provider response"}</Text><Text style={[styles.metaText, { color: colors.muted }]}>{browse.data ? `Rows ${offset + 1}–${offset + listings.length} of ${browse.data.total}` : ""}</Text></View>
            <Text style={[styles.identityMeta, { color: colors.muted }]}>Seller identity: {redundancy.sellerIdentity === "known" ? `${redundancy.sellerCount} seller IDs returned` : "unavailable in provider rows"}. Concentration is not inferred when identity is unavailable.</Text>
            {browse.error ? <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.error }]}><Text style={[styles.errorText, { color: colors.error }]}>Provider response unavailable. No local substitute is presented.</Text><Pressable onPress={() => void browse.refetch()} style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.retryText, { color: colors.onPrimary }]}>Retry</Text></Pressable></View> : null}
            {browse.isLoading ? <Text style={[styles.loadingText, { color: colors.muted }]}>Fetching provider rows…</Text> : null}
            {!browse.isLoading && !browse.error && !listings.length ? <Text style={[styles.emptyText, { color: colors.muted }]}>No provider rows returned for this query.</Text> : null}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Normalized provider rows</Text>
          </View>
        }
        renderItem={({ item }) => <ReconciliationRow listing={item} profileSlug={activeSlug} colors={colors} onInspect={() => setSelectedItemId(item.id.replace(/^ebay:/, ""))} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable onPress={() => void browse.refetch()} disabled={browse.isFetching} style={({ pressed }) => [styles.footerButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.footerButtonText, { color: colors.onPrimary }]}>{browse.isFetching ? "Refreshing…" : "Refresh source"}</Text></Pressable>
            <View style={styles.pagination}><Pressable disabled={offset === 0 || browse.isFetching} onPress={() => setOffset(Math.max(0, offset - 20))} style={({ pressed }) => [styles.pageButton, { borderColor: colors.border }, (offset === 0 || browse.isFetching) && styles.disabled, pressed && styles.pressed]}><Text style={[styles.pageText, { color: colors.foreground }]}>Previous</Text></Pressable><Pressable disabled={!browse.data?.hasMore || browse.isFetching} onPress={() => setOffset(offset + 20)} style={({ pressed }) => [styles.pageButton, { borderColor: colors.border }, (!browse.data?.hasMore || browse.isFetching) && styles.disabled, pressed && styles.pressed]}><Text style={[styles.pageText, { color: colors.foreground }]}>Next rows</Text></Pressable></View>
            <Text style={[styles.footerNote, { color: colors.muted }]}>A normalized row is an observation envelope. Candidate clusters are provisional and cannot be treated as confirmed stock.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

function Metric({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text></View>;
}

function ReconciliationRow({ listing, profileSlug, colors, onInspect }: { listing: Listing; profileSlug: string; colors: ReturnType<typeof useColors>; onInspect: () => void }) {
  const characteristicPrompts = evaluateEbayItemDetailCoverage({ profileSlug, localizedAspects: [] }).recommendedMissing;
  return <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.rowTop}><Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={2}>{listing.model}</Text><Text style={[styles.rowPrice, { color: colors.foreground }]}>{formatCurrency(listing.askingPrice, listing.currency)}</Text></View>
    <Text style={[styles.rowMeta, { color: colors.muted }]}>{listing.condition} · {listing.location} · seller {listing.sellerId ?? "unavailable"}</Text>
    <View style={styles.rowTags}><Text style={[styles.tag, { color: colors.primary }]}>ASK OBSERVATION</Text><Text style={[styles.tag, { color: colors.muted }]}>eBay Browse</Text></View>
    {characteristicPrompts.length ? <Text style={[styles.rowPrompt, { color: colors.muted }]}>Inspect seller aspects: {characteristicPrompts.join(", ")}</Text> : null}
    <Text style={[styles.rowDisclaimer, { color: colors.muted }]}>No market value, stock confirmation, or resale outcome inferred.</Text>
    <Pressable onPress={onInspect} style={({ pressed }) => [styles.inspectButton, { borderColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.inspectButtonText, { color: colors.primary }]}>Fetch item characteristics</Text></Pressable>
  </View>;
}

function ItemDetailCard({ detail, loading, error, profileSlug, colors, onClose }: { detail: LiveEbayItemDetail | null; loading: boolean; error: boolean; profileSlug: string; colors: ReturnType<typeof useColors>; onClose: () => void }) {
  const coverage = evaluateEbayItemDetailCoverage(detail ? { ...detail, profileSlug } : null);
  return <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
    <View style={styles.detailHeader}><Text style={[styles.detailTitle, { color: colors.foreground }]}>Provider item detail</Text><Pressable onPress={onClose}><MaterialIcons name="close" size={19} color={colors.muted} /></Pressable></View>
    {loading ? <Text style={[styles.detailText, { color: colors.muted }]}>Fetching seller-provided characteristics…</Text> : error ? <Text style={[styles.detailText, { color: colors.error }]}>Item detail unavailable. No substitute characteristics are shown.</Text> : detail ? <>
      <Text style={[styles.detailText, { color: colors.muted }]}>Fetched {new Date(detail.fetchedAt).toLocaleString()} · {detail.itemId}</Text>
      <Text style={[styles.detailCoverage, { color: coverage.state === "present" ? colors.success : colors.warning }]}>{coverage.state === "present" ? "Characteristic coverage present" : coverage.state === "partial" ? "Characteristic coverage partial" : "Characteristic coverage unavailable"}</Text>
      {detail.localizedAspects.length ? detail.localizedAspects.slice(0, 8).map((aspect) => <Text key={`${aspect.name}-${aspect.value}`} style={[styles.detailAspect, { color: colors.foreground }]}>{aspect.name}: {aspect.value}</Text>) : <Text style={[styles.detailText, { color: colors.muted }]}>The provider returned no localized aspects for this item.</Text>}
      <Text style={[styles.detailText, { color: colors.muted }]}>These are seller/provider fields only. They do not establish authenticity, value, stock or allocation eligibility.</Text>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: "800", marginTop: 5 },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20, maxWidth: 290 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  profileRail: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  profileChip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  profileChipText: { fontSize: 12, fontWeight: "700" },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14 },
  boundaryCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  boundaryTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  boundaryHeading: { fontSize: 15, fontWeight: "800" },
  boundaryText: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  metricRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metric: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12 },
  metricValue: { fontSize: 22, fontWeight: "800" },
  metricLabel: { fontSize: 11, marginTop: 3 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 22 },
  metaText: { fontSize: 10, flex: 1 },
  identityMeta: { fontSize: 11, lineHeight: 16, marginTop: -12, marginBottom: 20 },
  persistenceCard: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 },
  persistenceCopy: { flex: 1 },
  persistenceTitle: { fontSize: 13, fontWeight: "800" },
  persistenceText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  saveButton: { borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10 },
  saveButtonText: { fontSize: 12, fontWeight: "800" },
  saveError: { fontSize: 11, lineHeight: 16, marginTop: -8, marginBottom: 16 },
  errorCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  errorText: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  retryButton: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  retryText: { fontSize: 12, fontWeight: "800" },
  loadingText: { fontSize: 13, marginBottom: 18 },
  emptyText: { fontSize: 13, marginBottom: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  row: { borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 10 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowTitle: { fontSize: 14, fontWeight: "800", flex: 1, lineHeight: 19 },
  rowPrice: { fontSize: 14, fontWeight: "800" },
  rowMeta: { fontSize: 11, marginTop: 8 },
  rowTags: { flexDirection: "row", gap: 10, marginTop: 12 },
  tag: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  rowPrompt: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  rowDisclaimer: { fontSize: 11, marginTop: 10, lineHeight: 16 },
  inspectButton: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, marginTop: 12 },
  inspectButtonText: { fontSize: 11, fontWeight: "800" },
  detailCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailTitle: { fontSize: 14, fontWeight: "800" },
  detailText: { fontSize: 11, lineHeight: 16, marginTop: 8 },
  detailCoverage: { fontSize: 11, fontWeight: "800", marginTop: 9 },
  detailAspect: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  footer: { paddingTop: 8 },
  footerButton: { alignItems: "center", borderRadius: 14, paddingVertical: 13 },
  footerButtonText: { fontSize: 13, fontWeight: "800" },
  pagination: { flexDirection: "row", gap: 8, marginTop: 10 },
  pageButton: { flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 11 },
  pageText: { fontSize: 12, fontWeight: "700" },
  footerNote: { fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 16 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
