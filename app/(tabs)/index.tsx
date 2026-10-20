import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TransmissionPath } from "@/components/transmission-path";
import { ThesisEvidence } from "@/components/thesis-evidence";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import {
  LISTINGS,
  PROFILES,
  PROFILE_STORAGE_KEY,
  SAVED_STORAGE_KEY,
  DEFAULT_ECONOMICS,
  formatCurrency,
  getAskingPriceDecisionGate,
  getListingEconomics,
  getMaxAskingPriceForTarget,
  getProfile,
  getListingCountry,
  getListingSignals,
  getEbaySearchTerm,
  mapLiveEbayListings,
  type LiveEbayItemDetail,
  type Listing,
} from "@/lib/market-data";
import { buildDemoThesis } from "@/lib/demo-thesis";

const triggerHaptic = () => {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

const toSavedDealInput = (listing: Listing) => ({
  listingId: listing.id,
  profileSlug: listing.profileSlug,
  brand: listing.brand,
  model: listing.model,
  askingPrice: listing.askingPrice,
  marketValue: listing.marketValue,
  score: listing.score,
  marginPercentage: listing.margin,
  condition: listing.condition,
  platformSource: listing.platform,
  location: listing.location,
  escrowProtected: listing.escrowProtected,
  verified: listing.verified,
  url: listing.url,
});

export default function HomeScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const savedQuery = trpc.savedDeals.list.useQuery(undefined, { enabled: isAuthenticated });
  const toggleSavedMutation = trpc.savedDeals.toggle.useMutation({
    onSuccess: () => void savedQuery.refetch(),
  });
  const [activeSlug, setActiveSlug] = useState(PROFILES[0].slug);
  const [feedMode, setFeedMode] = useState<"sample" | "live">("live");
  const [liveOffset, setLiveOffset] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "top" | "escrow">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [radiusFilter, setRadiusFilter] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [showOutboundNotice, setShowOutboundNotice] = useState(false);

  const liveSearchQuery = query.trim() || getEbaySearchTerm(activeSlug);
  const liveSearch = trpc.marketplace.searchEbay.useQuery(
    { query: liveSearchQuery, marketplaceId: "EBAY_GB", limit: 20, offset: liveOffset },
    { enabled: feedMode === "live", staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  );
  const selectedLiveItemId = selectedListing?.sourceMode === "live-asking-price" ? selectedListing.id.replace(/^ebay:/, "") : "disabled-item";
  const liveItemDetail = trpc.marketplace.getEbayItem.useQuery(
    { itemId: selectedLiveItemId, marketplaceId: "EBAY_GB" },
    { enabled: Boolean(selectedListing?.sourceMode === "live-asking-price"), staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  );

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(PROFILE_STORAGE_KEY),
      AsyncStorage.getItem(SAVED_STORAGE_KEY),
    ]).then(([savedProfile, storedSavedIds]) => {
      if (savedProfile && PROFILES.some((profile) => profile.slug === savedProfile)) {
        setActiveSlug(savedProfile);
      }
      if (storedSavedIds) {
        setSavedIds(JSON.parse(storedSavedIds));
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated && savedQuery.data) {
      setSavedIds(savedQuery.data.map((deal) => deal.listingId));
    }
  }, [isAuthenticated, savedQuery.data]);

  useEffect(() => {
    setLiveOffset(0);
  }, [activeSlug, feedMode, query]);

  const activeProfile = getProfile(activeSlug);

  const liveListings = useMemo(
    () => mapLiveEbayListings((liveSearch.data?.listings ?? []).map((listing) => ({ ...listing, profileSlug: activeSlug }))),
    [activeSlug, liveSearch.data?.listings],
  );
  const displayedListings = feedMode === "live" ? liveListings : LISTINGS;
  const displayedProfileListings = useMemo(
    () => displayedListings.filter((listing) => listing.profileSlug === activeSlug),
    [activeSlug, displayedListings],
  );

  const listings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return displayedProfileListings.filter((listing) => {
      const belongsToProfile = listing.profileSlug === activeSlug;
      const matchesFilter = feedMode === "live" || filter === "all" || (filter === "top" ? listing.score >= 85 : listing.escrowProtected);
      const matchesSource = sourceFilter === "all" || listing.platform === sourceFilter;
      const matchesCountry = countryFilter === "all" || getListingCountry(listing) === countryFilter;
      const matchesRadius = radiusFilter === 0 || (listing.pickupDistanceKm !== undefined && listing.pickupDistanceKm <= radiusFilter);
      const matchesQuery =
        !normalizedQuery ||
        `${listing.brand} ${listing.model} ${listing.platform}`.toLowerCase().includes(normalizedQuery);
      return belongsToProfile && matchesFilter && matchesSource && matchesCountry && matchesRadius && matchesQuery;
    });
  }, [activeSlug, countryFilter, displayedProfileListings, feedMode, filter, query, radiusFilter, sourceFilter]);

  const profileListings = displayedProfileListings;
  const topCherries = profileListings.filter((listing) => listing.score >= 85).length;
  const averageMargin = profileListings.length
    ? profileListings.reduce((sum, listing) => sum + listing.margin, 0) / profileListings.length
    : 0;
  const leadListing = profileListings[0];

  const changeProfile = (slug: string) => {
    triggerHaptic();
    setActiveSlug(slug);
    setFilter("all");
    setSourceFilter("all");
    setCountryFilter("all");
    setRadiusFilter(0);
    setQuery("");
    void AsyncStorage.setItem(PROFILE_STORAGE_KEY, slug);
  };

  const changeFeedMode = (mode: "sample" | "live") => {
    triggerHaptic();
    setFeedMode(mode);
    setFilter("all");
    setSourceFilter("all");
    setCountryFilter("all");
    setRadiusFilter(0);
  };

  const toggleSaved = (listing: Listing) => {
    triggerHaptic();
    setSavedIds((current) => {
      const next = current.includes(listing.id) ? current.filter((savedId) => savedId !== listing.id) : [...current, listing.id];
      if (!isAuthenticated) void AsyncStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (isAuthenticated) toggleSavedMutation.mutate(toSavedDealInput(listing));
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={styles.brandLockup}>
                <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
                  <Text style={styles.brandMarkText}>TC</Text>
                </View>
                <View>
                  <Text style={[styles.eyebrow, { color: colors.muted }]}>GOOD MORNING, ALEX</Text>
                  <Text style={[styles.brandName, { color: colors.foreground }]}>Top Cherry</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Show market alerts"
                onPress={() => setShowNotice((current) => !current)}
                style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}
              >
                <MaterialIcons name="notifications-none" size={22} color={colors.foreground} />
                <View style={[styles.notificationDot, { backgroundColor: colors.primary }]} />
              </Pressable>
            </View>

            {showNotice ? (
              <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="bolt" size={18} color={colors.primary} />
                <Text style={[styles.noticeText, { color: colors.foreground }]}>3 fresh opportunities match your watchlist.</Text>
                <Pressable onPress={() => setShowNotice(false)}><MaterialIcons name="close" size={18} color={colors.muted} /></Pressable>
              </View>
            ) : null}

            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.foreground }]}>Find the edge.</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>The smartest deals, scored for you.</Text>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={21} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search brand, model, platform"
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.foreground }]}
              />
              <Pressable onPress={() => setQuery("")} style={({ pressed }) => pressed && styles.pressed}>
                <MaterialIcons name={query ? "close" : "tune"} size={20} color={query ? colors.muted : colors.primary} />
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Market profiles</Text>
              <Pressable onPress={() => router.push("/profile")} style={({ pressed }) => pressed && styles.pressed}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Manage</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={PROFILES}
              keyExtractor={(item) => item.slug}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.profileRail}
              renderItem={({ item }) => {
                const isActive = item.slug === activeSlug;
                return (
                  <Pressable
                    onPress={() => changeProfile(item.slug)}
                    style={({ pressed }) => [
                      styles.profileCard,
                      { backgroundColor: isActive ? item.accent : colors.surface, borderColor: isActive ? item.accent : colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.profileCardTop}>
                      <View style={[styles.profileIcon, { backgroundColor: isActive ? "rgba(16, 24, 20, 0.08)" : colors.background }]}>
                        <MaterialIcons name={item.icon} size={19} color={colors.foreground} />
                      </View>
                      {isActive ? <MaterialIcons name="check-circle" size={19} color={colors.foreground} /> : null}
                    </View>
                    <Text style={[styles.profileName, { color: colors.foreground }]}>{item.shortName}</Text>
                    <Text style={[styles.profileCount, { color: colors.muted }]}>{item.count} tracked deals</Text>
                  </Pressable>
                );
              }}
            />

            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your pulse</Text>
                <Text style={[styles.sectionCaption, { color: colors.muted }]}>{activeProfile.description}</Text>
              </View>
              <View style={[styles.feedControls, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(["live", "sample"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${mode} opportunity feed`}
                    onPress={() => changeFeedMode(mode)}
                    style={({ pressed }) => [styles.feedButton, feedMode === mode && { backgroundColor: mode === "live" ? colors.primary : colors.foreground }, pressed && styles.pressed]}
                  >
                    {mode === "live" ? <View style={[styles.liveDot, { backgroundColor: feedMode === mode ? colors.foreground : colors.success }]} /> : null}
                    <Text style={[styles.liveText, { color: feedMode === mode ? colors.background : colors.muted }]}>{mode === "live" ? "LIVE" : "SAMPLE"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.metricsRow}>
              <MetricCard label={feedMode === "live" ? "Live listings" : "Tracked"} value={String(profileListings.length || (feedMode === "sample" ? activeProfile.count : 0))} colors={colors} />
              <MetricCard label={feedMode === "live" ? "Market value" : "Top cherries"} value={feedMode === "live" ? "Unknown" : String(topCherries)} colors={colors} accent />
              <MetricCard label={feedMode === "live" ? "Price history" : "Avg. margin"} value={feedMode === "live" ? "Not linked" : `${averageMargin.toFixed(1)}%`} colors={colors} />
            </View>
            {feedMode === "live" ? <LiveAskingPriceLens listing={leadListing} colors={colors} loading={liveSearch.isLoading} error={liveSearch.error ? "Live eBay search unavailable" : null} onRefresh={() => { setLiveOffset(0); void liveSearch.refetch(); }} /> : leadListing ? <PrototypeLens listing={leadListing} colors={colors} /> : null}

            <View style={styles.filterRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{feedMode === "live" ? "Live asking prices" : "Latest opportunities"}</Text>
              <View style={styles.filterButtons}>
                {(feedMode === "live" ? (["all"] as const) : (["all", "top", "escrow"] as const)).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => { triggerHaptic(); setFilter(value); }}
                    style={({ pressed }) => [styles.filterButton, { backgroundColor: filter === value ? colors.foreground : colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
                  >
                    <Text style={[styles.filterButtonText, { color: filter === value ? colors.background : colors.muted }]}>
                      {value === "all" ? "All" : value === "top" ? "Top" : "Escrow"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FlatList
              horizontal
              data={["all", ...Array.from(new Set(profileListings.map((listing) => listing.platform)))]}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sourceRail}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { triggerHaptic(); setSourceFilter(item); }}
                  style={({ pressed }) => [styles.filterButton, { backgroundColor: sourceFilter === item ? colors.primary : colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
                >
                  <Text style={[styles.filterButtonText, { color: sourceFilter === item ? colors.foreground : colors.muted }]}>{item === "all" ? "All sources" : item}</Text>
                </Pressable>
              )}
            />
            <View style={styles.locationFilterRow}>
              <FlatList
                horizontal
                data={["all", ...Array.from(new Set(profileListings.map(getListingCountry)))]}
                keyExtractor={(item) => `country-${item}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceRail}
                renderItem={({ item }) => (
                  <Pressable onPress={() => { triggerHaptic(); setCountryFilter(item); }} style={({ pressed }) => [styles.filterButton, { backgroundColor: countryFilter === item ? colors.foreground : colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                    <Text style={[styles.filterButtonText, { color: countryFilter === item ? colors.background : colors.muted }]}>{item === "all" ? "All countries" : item}</Text>
                  </Pressable>
                )}
              />
              <FlatList
                horizontal
                data={[0, 25, 100, 250]}
                keyExtractor={(item) => `radius-${item}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceRail}
                renderItem={({ item }) => (
                  <Pressable onPress={() => { triggerHaptic(); setRadiusFilter(item); }} style={({ pressed }) => [styles.filterButton, { backgroundColor: radiusFilter === item ? colors.primary : colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                    <Text style={[styles.filterButtonText, { color: radiusFilter === item ? colors.foreground : colors.muted }]}>{item === 0 ? "Any distance" : `≤${item} km`}</Text>
                  </Pressable>
                )}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            isSaved={savedIds.includes(item.id)}
            colors={colors}
            onPress={() => setSelectedListing(item)}
            onSave={() => toggleSaved(item)}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="search-off" size={24} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No matches yet</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Try a different search or filter.</Text>
          </View>
        }
        ListFooterComponent={feedMode === "live" ? <LiveFeedFooter loading={liveSearch.isFetching} hasMore={Boolean(liveSearch.data?.hasMore)} onRefresh={() => { setLiveOffset(0); void liveSearch.refetch(); }} onNext={() => setLiveOffset((current) => current + 20)} colors={colors} /> : null}
      />
      <Modal visible={Boolean(selectedListing)} transparent animationType="slide" onRequestClose={() => setSelectedListing(null)}>
        {selectedListing ? (
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalTopRow}>
                <View style={[styles.scoreLarge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.scoreLargeText, { color: colors.onPrimary }]}>{selectedListing.score}</Text>
                  <Text style={[styles.scoreLargeLabel, { color: colors.onPrimary }]}>SCORE</Text>
                </View>
                <Pressable onPress={() => setSelectedListing(null)} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}>
                  <MaterialIcons name="close" size={20} color={colors.foreground} />
                </Pressable>
              </View>
              <Text style={[styles.modalEyebrow, { color: colors.muted }]}>{selectedListing.platform} · {selectedListing.location}</Text>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedListing.brand}</Text>
              <Text style={[styles.modalModel, { color: colors.muted }]}>{selectedListing.model}</Text>
              <View style={[styles.detailGrid, { borderColor: colors.border }]}>
                <DetailCell label="Asking" value={formatCurrency(selectedListing.askingPrice, selectedListing.currency)} colors={colors} />
                <DetailCell label="Market value" value={selectedListing.sourceMode === "live-asking-price" ? "Unknown" : formatCurrency(selectedListing.marketValue, selectedListing.currency)} colors={colors} />
                <DetailCell label="Margin" value={selectedListing.sourceMode === "live-asking-price" ? "Unavailable" : `${selectedListing.margin.toFixed(1)}%`} colors={colors} />
                <DetailCell label="Condition" value={selectedListing.condition} colors={colors} />
              </View>
              {selectedListing.sourceMode === "live-asking-price" ? <LiveAskingPriceDetail listing={selectedListing} colors={colors} detail={liveItemDetail.data} loading={liveItemDetail.isLoading} /> : <><LayerLens listing={selectedListing} colors={colors} /><ReasoningDetail listing={selectedListing} colors={colors} /></>}
              <View style={styles.trustRow}>
                <MaterialIcons name={selectedListing.escrowProtected ? "verified-user" : "shield"} size={18} color={selectedListing.escrowProtected ? colors.success : colors.muted} />
                <Text style={[styles.trustText, { color: colors.foreground }]}>{selectedListing.escrowProtected ? "Escrow protected listing" : "Review seller protection before buying"}</Text>
              </View>
              <View style={styles.modalActions}>
                <Pressable onPress={() => toggleSaved(selectedListing)} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.pressed]}>
                  <MaterialIcons name={savedIds.includes(selectedListing.id) ? "bookmark" : "bookmark-border"} size={20} color={colors.foreground} />
                  <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{savedIds.includes(selectedListing.id) ? "Saved" : "Save deal"}</Text>
                </Pressable>
                <Pressable onPress={() => { if (selectedListing.sourceMode === "live-asking-price") setShowOutboundNotice(true); else void Linking.openURL(selectedListing.url); }} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Open listing</Text>
                  <MaterialIcons name="north-east" size={18} color={colors.onPrimary} />
                </Pressable>
              </View>
              {selectedListing.sourceMode === "live-asking-price" && showOutboundNotice ? <View style={[styles.outboundNotice, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.outboundTitle, { color: colors.foreground }]}>Leaving Top Cherry</Text><Text style={[styles.outboundText, { color: colors.muted }]}>You are going to eBay to inspect this listing. Top Cherry is not eBay, does not process the transaction, and has not verified the asking price as a sale price. Affiliate disclosure: Top Cherry may earn a commission if you buy through this link.</Text><View style={styles.outboundActions}><Pressable onPress={() => setShowOutboundNotice(false)} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Cancel</Text></Pressable><Pressable onPress={() => { setShowOutboundNotice(false); void Linking.openURL(selectedListing.affiliateUrl ?? selectedListing.url); }} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Continue to eBay</Text></Pressable></View></View> : null}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </Modal>
    </ScreenContainer>
  );
}

function MetricCard({ label, value, colors, accent = false }: { label: string; value: string; colors: ReturnType<typeof useColors>; accent?: boolean }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: accent ? colors.primary : colors.surface, borderColor: accent ? colors.primary : colors.border }]}>
      <Text style={[styles.metricValue, { color: accent ? colors.onPrimary : colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function PrototypeLens({ listing, colors }: { listing: Listing; colors: ReturnType<typeof useColors> }) {
  const signals = getListingSignals(listing);
  return (
    <View style={[styles.prototypeLens, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.prototypeLensTop}><View><Text style={[styles.prototypeEyebrow, { color: colors.primary }]}>THREE-LAYER PROTOTYPE</Text><Text style={[styles.prototypeTitle, { color: colors.foreground }]}>Market lens</Text></View><Text style={[styles.prototypeHint, { color: colors.muted }]}>sample signals</Text></View>
      <View style={styles.prototypeColumns}>
        <View style={styles.prototypeColumn}><Text style={[styles.prototypeNumber, { color: colors.foreground }]}>1</Text><Text style={[styles.prototypeLabel, { color: colors.muted }]}>Visible</Text><Text style={[styles.prototypeValue, { color: colors.foreground }]}>{formatCurrency(listing.askingPrice, listing.currency)}</Text></View>
        <View style={[styles.prototypeDivider, { backgroundColor: colors.border }]} />
        <View style={styles.prototypeColumn}><Text style={[styles.prototypeNumber, { color: colors.foreground }]}>2</Text><Text style={[styles.prototypeLabel, { color: colors.muted }]}>Behavior</Text><Text style={[styles.prototypeValue, { color: colors.foreground }]}>{signals.inventoryPressure}</Text></View>
        <View style={[styles.prototypeDivider, { backgroundColor: colors.border }]} />
        <View style={styles.prototypeColumn}><Text style={[styles.prototypeNumber, { color: colors.foreground }]}>3</Text><Text style={[styles.prototypeLabel, { color: colors.muted }]}>Network</Text><Text style={[styles.prototypeValue, { color: colors.foreground }]}>{signals.networkMomentum}</Text></View>
      </View>
      <Text style={[styles.prototypeAction, { color: colors.foreground }]}>{signals.actionWindow}: <Text style={{ color: colors.muted }}>{signals.actionReason}</Text></Text>
    </View>
  );
}

function LiveAskingPriceLens({ listing, colors, loading, error, onRefresh }: { listing?: Listing; colors: ReturnType<typeof useColors>; loading: boolean; error: string | null; onRefresh: () => void }) {
  return (
    <View style={[styles.prototypeLens, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.prototypeLensTop}><View><Text style={[styles.prototypeEyebrow, { color: colors.primary }]}>LIVE ASKING PRICES</Text><Text style={[styles.prototypeTitle, { color: colors.foreground }]}>eBay Browse · EBAY_GB</Text></View><Text style={[styles.prototypeHint, { color: colors.muted }]}>{loading ? "loading" : error ? "error" : "read-only"}</Text></View>
      <Text style={[styles.prototypeAction, { color: colors.foreground }]}>{error ?? (listing ? `${formatCurrency(listing.askingPrice, listing.currency)} is a current listing ask.` : "Fetching current eBay item summaries.")}</Text>
      <Text style={[styles.liveDisclaimer, { color: colors.muted }]}>Asking price only. Market value, resale margin, availability history and transaction outcome are not inferred.</Text>
      <Pressable onPress={onRefresh} disabled={loading} style={({ pressed }) => [styles.refreshButton, { backgroundColor: colors.primary, opacity: loading ? 0.5 : 1 }, pressed && styles.pressed]}><MaterialIcons name="refresh" size={15} color={colors.onPrimary} /><Text style={[styles.refreshText, { color: colors.onPrimary }]}>{loading ? "Refreshing" : "Refresh live prices"}</Text></Pressable>
    </View>
  );
}

function LiveAskingPriceDetail({ listing, colors, detail, loading }: { listing: Listing; colors: ReturnType<typeof useColors>; detail?: LiveEbayItemDetail; loading: boolean }) {
  const aspects = detail?.localizedAspects.slice(0, 8) ?? [];
  const gate = getAskingPriceDecisionGate(listing);
  return (
    <View style={[styles.layerLens, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.layerLensEyebrow, { color: colors.primary }]}>SOURCE PROVENANCE</Text>
      <Text style={[styles.layerLensTitle, { color: colors.foreground }]}>Live eBay asking price</Text>
      <Text style={[styles.layerText, { color: colors.muted }]}>Retrieved from eBay Browse for EBAY_GB. This record is a visible marketplace observation, not a verified sale or valuation.</Text>
      <Text style={[styles.layerText, { color: colors.muted }]}>Use the source listing to inspect seller details, condition and delivery before any separate research decision.</Text>
      <View style={[styles.decisionGate, { backgroundColor: colors.background, borderColor: colors.warning }]}>
        <View style={styles.decisionGateHeader}><MaterialIcons name="rule" size={17} color={colors.warning} /><Text style={[styles.decisionGateTitle, { color: colors.foreground }]}>Decision gate · observe only</Text></View>
        <Text style={[styles.decisionGateText, { color: colors.muted }]}>{gate.leverage}</Text>
        <Text style={[styles.decisionGateMissing, { color: colors.foreground }]}>Before considering one unit, establish:</Text>
        {gate.missingEvidence.map((item) => <Text key={item} style={[styles.decisionGateItem, { color: colors.muted }]}>• {item}</Text>)}
      </View>
      <AskingPriceWorksheet listing={listing} colors={colors} />
      <Text style={[styles.detailSubheading, { color: colors.foreground }]}>Item characteristics</Text>
      {loading ? <Text style={[styles.layerText, { color: colors.muted }]}>Loading eBay item details…</Text> : aspects.length ? aspects.map((aspect) => <View key={`${aspect.name}-${aspect.value}`} style={styles.aspectRow}><Text style={[styles.aspectName, { color: colors.muted }]}>{aspect.name}</Text><Text style={[styles.aspectValue, { color: colors.foreground }]}>{aspect.value}</Text></View>) : <Text style={[styles.layerText, { color: colors.muted }]}>No seller-provided characteristics were returned for this listing.</Text>}
    </View>
  );
}

function AskingPriceWorksheet({ listing, colors }: { listing: Listing; colors: ReturnType<typeof useColors> }) {
  const [targetExitText, setTargetExitText] = useState("");
  const [minimumBufferText, setMinimumBufferText] = useState("");
  const targetExit = Number(targetExitText.replace(/[^0-9.]/g, "")) || 0;
  const minimumBuffer = Number(minimumBufferText.replace(/[^0-9.]/g, "")) || 0;
  const economics = getListingEconomics(listing, DEFAULT_ECONOMICS);
  const currentAllIn = listing.askingPrice + economics.totalCosts;
  const maxAsk = targetExit > 0 ? getMaxAskingPriceForTarget({ targetExitPrice: targetExit, minimumNetBuffer: minimumBuffer, fixedTravelCost: economics.travelCost }) : null;
  const withinThreshold = maxAsk !== null && listing.askingPrice <= maxAsk;
  return <View style={[styles.worksheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.worksheetEyebrow, { color: colors.primary }]}>USER-DEFINED PRICE TEST</Text>
    <Text style={[styles.worksheetTitle, { color: colors.foreground }]}>Why give up this amount?</Text>
    <Text style={[styles.worksheetText, { color: colors.muted }]}>Enter your independent exit benchmark and minimum net buffer. This does not create a market value; it tests whether the current ask fits your own hurdle after estimated friction.</Text>
    <View style={styles.worksheetInputs}>
      <View style={styles.worksheetInputBlock}><Text style={[styles.worksheetLabel, { color: colors.muted }]}>EXIT BENCHMARK</Text><TextInput value={targetExitText} onChangeText={setTargetExitText} keyboardType="decimal-pad" placeholder="e.g. 5000" placeholderTextColor={colors.muted} style={[styles.worksheetInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} /></View>
      <View style={styles.worksheetInputBlock}><Text style={[styles.worksheetLabel, { color: colors.muted }]}>MIN NET BUFFER</Text><TextInput value={minimumBufferText} onChangeText={setMinimumBufferText} keyboardType="decimal-pad" placeholder="e.g. 500" placeholderTextColor={colors.muted} style={[styles.worksheetInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} /></View>
    </View>
    <View style={styles.worksheetResults}>
      <View><Text style={[styles.worksheetLabel, { color: colors.muted }]}>CURRENT ALL-IN ESTIMATE</Text><Text style={[styles.worksheetValue, { color: colors.foreground }]}>{formatCurrency(currentAllIn, listing.currency)}</Text></View>
      <View><Text style={[styles.worksheetLabel, { color: colors.muted }]}>MAX ASK AT YOUR HURDLE</Text><Text style={[styles.worksheetValue, { color: maxAsk === null ? colors.muted : withinThreshold ? colors.success : colors.error }]}>{maxAsk === null ? "Enter benchmark" : formatCurrency(maxAsk, listing.currency)}</Text></View>
    </View>
    {maxAsk !== null ? <Text style={[styles.worksheetResultNote, { color: withinThreshold ? colors.success : colors.error }]}>{withinThreshold ? "The asking price is inside your stated hurdle; independent evidence is still required." : "The asking price is above your stated hurdle after estimated friction."}</Text> : null}
  </View>;
}

function LiveFeedFooter({ loading, hasMore, onRefresh, onNext, colors }: { loading: boolean; hasMore: boolean; onRefresh: () => void; onNext: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.feedFooter}>
      {hasMore ? <Pressable onPress={onNext} disabled={loading} style={({ pressed }) => [styles.footerButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.footerButtonText, { color: colors.foreground }]}>{loading ? "Loading" : "Load next 20"}</Text></Pressable> : null}
      <Pressable onPress={onRefresh} disabled={loading} style={({ pressed }) => [styles.footerButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.footerButtonText, { color: colors.muted }]}>{loading ? "Updating…" : "Refresh"}</Text></Pressable>
    </View>
  );
}

function ListingCard({ listing, isSaved, colors, onPress, onSave }: { listing: Listing; isSaved: boolean; colors: ReturnType<typeof useColors>; onPress: () => void; onSave: () => void }) {
  const signals = getListingSignals(listing);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listingCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.cardPressed]}>
      <View style={styles.listingTopRow}>
        <View style={styles.listingSource}>
          <View style={[styles.sourceIcon, { backgroundColor: colors.background }]}><Text style={[styles.sourceIconText, { color: colors.foreground }]}>{listing.platform.slice(0, 1)}</Text></View>
          <View>
            <Text style={[styles.platformText, { color: colors.muted }]}>{listing.platform} · {listing.age}</Text>
            <Text style={[styles.listingBrand, { color: colors.foreground }]}>{listing.brand}</Text>
          </View>
        </View>
        <Pressable onPress={onSave} accessibilityLabel={isSaved ? "Remove saved listing" : "Save listing"} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <MaterialIcons name={isSaved ? "bookmark" : "bookmark-border"} size={22} color={isSaved ? colors.primary : colors.muted} />
        </Pressable>
      </View>
      <Text style={[styles.listingModel, { color: colors.foreground }]} numberOfLines={1}>{listing.model}</Text>
      <View style={styles.listingBottomRow}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.muted }]}>ASKING</Text>
          <Text style={[styles.price, { color: colors.foreground }]}>{formatCurrency(listing.askingPrice, listing.currency)}</Text>
        </View>
        {listing.sourceMode === "live-asking-price" ? <View style={styles.marginBlock}><Text style={[styles.priceLabel, { color: colors.muted }]}>VALUE</Text><Text style={[styles.margin, { color: colors.muted }]}>Unknown</Text></View> : <View style={styles.marginBlock}><Text style={[styles.priceLabel, { color: colors.muted }]}>MARGIN</Text><Text style={[styles.margin, { color: colors.success }]}>+{listing.margin.toFixed(1)}%</Text></View>}
      <View style={[styles.scorePill, { backgroundColor: colors.primary }]}>
          <Text style={[styles.scorePillText, { color: colors.onPrimary }]}>{listing.sourceMode === "live-asking-price" ? "LIVE" : listing.score}</Text>
          <Text style={[styles.scorePillLabel, { color: colors.onPrimary }]}>{listing.sourceMode === "live-asking-price" ? "ASK" : "CHERRY"}</Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: colors.background }]}><MaterialIcons name="verified" size={13} color={colors.success} /><Text style={[styles.badgeText, { color: colors.muted }]}>{listing.verified ? "Verified" : "Seller check"}</Text></View>
        {listing.escrowProtected ? <View style={[styles.badge, { backgroundColor: colors.background }]}><MaterialIcons name="lock" size={12} color={colors.muted} /><Text style={[styles.badgeText, { color: colors.muted }]}>Escrow</Text></View> : null}
        <View style={[styles.badge, { backgroundColor: colors.background }]}><MaterialIcons name="trending-up" size={13} color={colors.primary} /><Text style={[styles.badgeText, { color: colors.primary }]}>{signals.actionWindow}</Text></View>
        <Text style={[styles.detailHint, { color: colors.primary }]}>View details <MaterialIcons name="arrow-forward" size={13} color={colors.primary} /></Text>
      </View>
    </Pressable>
  );
}

function ReasoningDetail({ listing, colors }: { listing: Listing; colors: ReturnType<typeof useColors> }) {
  const demo = buildDemoThesis(listing);
  return (
    <View>
      <View style={styles.reasoningBanner}>
        <MaterialIcons name="science" size={16} color={colors.primary} />
        <Text style={[styles.reasoningBannerText, { color: colors.muted }]}>Demonstration thesis · sample signals only · not a live forecast</Text>
      </View>
      <TransmissionPath evaluation={demo.evaluation} colors={colors} />
      <ThesisEvidence evaluation={demo.evaluation} sourceLabel="Top Cherry sample signals" colors={colors} />
    </View>
  );
}

function DetailCell({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.detailCell}><Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text></View>;
}

function LayerLens({ listing, colors }: { listing: Listing; colors: ReturnType<typeof useColors> }) {
  const signals = getListingSignals(listing);
  const riskColor = signals.distortionRisk === "Low" ? colors.success : signals.distortionRisk === "Medium" ? colors.warning : colors.error;
  return (
    <View style={[styles.layerLens, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.layerLensHeader}>
        <View>
          <Text style={[styles.layerLensEyebrow, { color: colors.primary }]}>THREE-LAYER LENS</Text>
          <Text style={[styles.layerLensTitle, { color: colors.foreground }]}>Why this may be actionable</Text>
        </View>
        <View style={[styles.actionBadge, { backgroundColor: colors.primary }]}><Text style={[styles.actionBadgeText, { color: colors.onPrimary }]}>{signals.actionWindow.toUpperCase()}</Text></View>
      </View>
      <View style={styles.layerRow}>
        <View style={[styles.layerNumber, { backgroundColor: colors.background }]}><Text style={[styles.layerNumberText, { color: colors.primary }]}>1</Text></View>
        <View style={styles.layerCopy}><Text style={[styles.layerName, { color: colors.foreground }]}>Visible market</Text><Text style={[styles.layerText, { color: colors.muted }]}>{formatCurrency(listing.askingPrice)} asking · {listing.platform} · {listing.location}</Text></View>
      </View>
      <View style={styles.layerRow}>
        <View style={[styles.layerNumber, { backgroundColor: colors.background }]}><Text style={[styles.layerNumberText, { color: colors.primary }]}>2</Text></View>
        <View style={styles.layerCopy}><Text style={[styles.layerName, { color: colors.foreground }]}>Market behavior</Text><Text style={[styles.layerText, { color: colors.muted }]}>{signals.inventoryPressure} inventory · {signals.pricePressure.toLowerCase()} price pressure · {signals.activeComparables} comparables</Text></View>
      </View>
      <View style={styles.layerRow}>
        <View style={[styles.layerNumber, { backgroundColor: colors.background }]}><Text style={[styles.layerNumberText, { color: colors.primary }]}>3</Text></View>
        <View style={styles.layerCopy}><Text style={[styles.layerName, { color: colors.foreground }]}>Network & novelty</Text><Text style={[styles.layerText, { color: colors.muted }]}>{signals.networkMomentum} momentum · {signals.noveltyScore}/100 novelty · {signals.propagationScore}/100 propagation</Text></View>
      </View>
      <View style={[styles.signalStrip, { borderTopColor: colors.border }]}>
        <Text style={[styles.signalText, { color: colors.foreground }]}>Distortion risk: <Text style={{ color: riskColor }}>{signals.distortionRisk}</Text></Text>
        <Text style={[styles.signalText, { color: colors.muted }]}>{signals.demandDiversity} demand diversity</Text>
      </View>
      <Text style={[styles.actionReason, { color: colors.foreground }]}>{signals.actionReason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  brandMarkText: { fontSize: 13, fontWeight: "900", letterSpacing: -0.5, color: "#172019" },
  eyebrow: { fontSize: 9, fontWeight: "800", letterSpacing: 1.3, marginBottom: 1 },
  brandName: { fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", position: "relative" },
  notificationDot: { position: "absolute", width: 7, height: 7, borderRadius: 4, top: 9, right: 10, borderWidth: 1.5, borderColor: "#20241f" },
  notice: { marginTop: 14, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  noticeText: { flex: 1, fontSize: 12, fontWeight: "600" },
  titleBlock: { marginTop: 28, marginBottom: 19 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -1.4, lineHeight: 39 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: 4 },
  searchBox: { minHeight: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  sectionHeader: { marginTop: 28, marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.25 },
  sectionCaption: { fontSize: 12, marginTop: 3, maxWidth: 260 },
  linkText: { fontSize: 13, fontWeight: "700" },
  profileRail: { gap: 10, paddingRight: 20 },
  sourceRail: { gap: 6, paddingBottom: 2, paddingRight: 20 },
  locationFilterRow: { marginTop: 4, gap: 2 },
  profileCard: { width: 142, minHeight: 128, borderRadius: 18, borderWidth: 1, padding: 13, justifyContent: "space-between" },
  profileCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 15, fontWeight: "800", marginTop: 18 },
  profileCount: { fontSize: 11, marginTop: 3 },
  livePill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  feedControls: { borderRadius: 99, borderWidth: 1, padding: 3, flexDirection: "row", alignItems: "center", gap: 2 },
  feedButton: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 5, minHeight: 24, flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  metricsRow: { flexDirection: "row", gap: 8 },
  metricCard: { flex: 1, minHeight: 78, borderRadius: 16, borderWidth: 1, padding: 12, justifyContent: "space-between" },
  metricValue: { fontSize: 23, fontWeight: "800", letterSpacing: -0.8 },
  metricLabel: { fontSize: 10, fontWeight: "600" },
  prototypeLens: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 12 },
  prototypeLensTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  prototypeEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  prototypeTitle: { fontSize: 16, fontWeight: "800", marginTop: 3 },
  prototypeHint: { fontSize: 10, marginTop: 2 },
  prototypeColumns: { flexDirection: "row", alignItems: "stretch", marginTop: 13 },
  prototypeColumn: { flex: 1 },
  prototypeDivider: { width: 1, marginHorizontal: 10 },
  prototypeNumber: { fontSize: 11, fontWeight: "900" },
  prototypeLabel: { fontSize: 10, marginTop: 2 },
  prototypeValue: { fontSize: 12, fontWeight: "800", marginTop: 4 },
  prototypeAction: { fontSize: 10, lineHeight: 15, marginTop: 13 },
  liveDisclaimer: { fontSize: 10, lineHeight: 15, marginTop: 7 },
  decisionGate: { borderWidth: 1, borderRadius: 14, padding: 11, marginTop: 12 },
  decisionGateHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  decisionGateTitle: { fontSize: 12, fontWeight: "800" },
  decisionGateText: { fontSize: 10, lineHeight: 15, marginTop: 6 },
  decisionGateMissing: { fontSize: 10, fontWeight: "800", marginTop: 9 },
  decisionGateItem: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  worksheet: { borderWidth: 1, borderRadius: 14, padding: 11, marginTop: 12 },
  worksheetEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  worksheetTitle: { fontSize: 13, fontWeight: "800", marginTop: 3 },
  worksheetText: { fontSize: 10, lineHeight: 15, marginTop: 5 },
  worksheetInputs: { flexDirection: "row", gap: 8, marginTop: 10 },
  worksheetInputBlock: { flex: 1 },
  worksheetLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 0.4 },
  worksheetInput: { borderWidth: 1, borderRadius: 8, height: 32, paddingHorizontal: 8, marginTop: 4, fontSize: 11 },
  worksheetResults: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 11 },
  worksheetValue: { fontSize: 14, fontWeight: "800", marginTop: 3 },
  worksheetResultNote: { fontSize: 10, lineHeight: 15, marginTop: 8 },
  detailSubheading: { fontSize: 12, fontWeight: "800", marginTop: 14, marginBottom: 6 },
  aspectRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4 },
  aspectName: { flex: 1, fontSize: 10 },
  aspectValue: { flex: 1, fontSize: 10, fontWeight: "700", textAlign: "right" },
  outboundNotice: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 12 },
  outboundTitle: { fontSize: 13, fontWeight: "800" },
  outboundText: { fontSize: 10, lineHeight: 15, marginTop: 6 },
  outboundActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 },
  refreshButton: { alignSelf: "flex-start", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5, marginTop: 11 },
  refreshText: { fontSize: 10, fontWeight: "800" },
  feedFooter: { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 12 },
  footerButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  footerButtonText: { fontSize: 10, fontWeight: "800" },
  filterRow: { marginTop: 29, marginBottom: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  filterButtons: { flexDirection: "row", gap: 5 },
  filterButton: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 7 },
  filterButtonText: { fontSize: 10, fontWeight: "700" },
  listingCard: { borderRadius: 19, borderWidth: 1, padding: 15, marginBottom: 11 },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  listingTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  listingSource: { flexDirection: "row", alignItems: "center", gap: 9 },
  sourceIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sourceIconText: { fontSize: 14, fontWeight: "900" },
  platformText: { fontSize: 10, marginBottom: 2 },
  listingBrand: { fontSize: 14, fontWeight: "800" },
  saveButton: { padding: 2 },
  listingModel: { fontSize: 15, fontWeight: "700", marginTop: 13 },
  listingBottomRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 17 },
  priceLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  price: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  marginBlock: { marginLeft: 22 },
  margin: { fontSize: 15, fontWeight: "800", marginTop: 5 },
  scorePill: { marginLeft: "auto", width: 56, height: 47, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  scorePillText: { fontSize: 20, fontWeight: "900", lineHeight: 21 },
  scorePillLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 15 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 },
  badgeText: { fontSize: 9, fontWeight: "600" },
  detailHint: { marginLeft: "auto", fontSize: 10, fontWeight: "700" },
  layerLens: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 20 },
  layerLensHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  layerLensEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  layerLensTitle: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  actionBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  actionBadgeText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  layerRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 9 },
  layerNumber: { width: 25, height: 25, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  layerNumberText: { fontSize: 12, fontWeight: "900" },
  layerCopy: { flex: 1 },
  layerName: { fontSize: 11, fontWeight: "800" },
  layerText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  signalStrip: { borderTopWidth: 1, marginTop: 13, paddingTop: 11, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  signalText: { fontSize: 10, fontWeight: "700" },
  actionReason: { fontSize: 11, lineHeight: 16, marginTop: 11 },
  emptyState: { borderRadius: 18, borderWidth: 1, alignItems: "center", paddingVertical: 28, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyText: { fontSize: 12 },
  pressed: { opacity: 0.65 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14, 18, 15, 0.54)" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32 },
  modalHandle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "#C6CBC1", marginBottom: 21 },
  modalScroll: { paddingBottom: 2 },
  reasoningBanner: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  reasoningBannerText: { flex: 1, fontSize: 10, lineHeight: 14 },
  modalTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  scoreLarge: { width: 67, height: 67, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  scoreLargeText: { fontSize: 28, fontWeight: "900", lineHeight: 29 },
  scoreLargeLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  closeButton: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  modalEyebrow: { fontSize: 11, fontWeight: "700", marginTop: 22, textTransform: "uppercase", letterSpacing: 0.8 },
  modalTitle: { fontSize: 29, fontWeight: "900", letterSpacing: -1, marginTop: 8 },
  modalModel: { fontSize: 14, marginTop: 3 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderBottomWidth: 1, marginTop: 22, paddingVertical: 15, rowGap: 15 },
  detailCell: { width: "50%" },
  detailLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.7 },
  detailValue: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 17 },
  trustText: { fontSize: 12, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 23 },
  secondaryButton: { flex: 1, minHeight: 50, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  secondaryButtonText: { fontSize: 13, fontWeight: "800" },
  primaryButton: { flex: 1.25, minHeight: 50, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  primaryButtonText: { fontSize: 13, fontWeight: "800" },
});
