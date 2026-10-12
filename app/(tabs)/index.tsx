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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import {
  LISTINGS,
  PROFILES,
  PROFILE_STORAGE_KEY,
  SAVED_STORAGE_KEY,
  formatCurrency,
  getProfile,
  getListingCountry,
  getListingSignals,
  type Listing,
} from "@/lib/market-data";

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
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "top" | "escrow">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [radiusFilter, setRadiusFilter] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showNotice, setShowNotice] = useState(false);

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

  const activeProfile = getProfile(activeSlug);

  const listings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return LISTINGS.filter((listing) => {
      const belongsToProfile = listing.profileSlug === activeSlug;
      const matchesFilter = filter === "all" || (filter === "top" ? listing.score >= 85 : listing.escrowProtected);
      const matchesSource = sourceFilter === "all" || listing.platform === sourceFilter;
      const matchesCountry = countryFilter === "all" || getListingCountry(listing) === countryFilter;
      const matchesRadius = radiusFilter === 0 || (listing.pickupDistanceKm !== undefined && listing.pickupDistanceKm <= radiusFilter);
      const matchesQuery =
        !normalizedQuery ||
        `${listing.brand} ${listing.model} ${listing.platform}`.toLowerCase().includes(normalizedQuery);
      return belongsToProfile && matchesFilter && matchesSource && matchesCountry && matchesRadius && matchesQuery;
    });
  }, [activeSlug, countryFilter, filter, query, radiusFilter, sourceFilter]);

  const profileListings = useMemo(
    () => LISTINGS.filter((listing) => listing.profileSlug === activeSlug),
    [activeSlug],
  );
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
              <View style={[styles.livePill, { backgroundColor: colors.surface }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveText, { color: colors.foreground }]}>SAMPLE</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <MetricCard label="Tracked" value={String(profileListings.length || activeProfile.count)} colors={colors} />
              <MetricCard label="Top cherries" value={String(topCherries)} colors={colors} accent />
              <MetricCard label="Avg. margin" value={`${averageMargin.toFixed(1)}%`} colors={colors} />
            </View>
            {leadListing ? <PrototypeLens listing={leadListing} colors={colors} /> : null}

            <View style={styles.filterRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Latest opportunities</Text>
              <View style={styles.filterButtons}>
                {(["all", "top", "escrow"] as const).map((value) => (
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
      />
      <Modal visible={Boolean(selectedListing)} transparent animationType="slide" onRequestClose={() => setSelectedListing(null)}>
        {selectedListing ? (
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTopRow}>
                <View style={[styles.scoreLarge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.scoreLargeText, { color: colors.foreground }]}>{selectedListing.score}</Text>
                  <Text style={[styles.scoreLargeLabel, { color: colors.foreground }]}>SCORE</Text>
                </View>
                <Pressable onPress={() => setSelectedListing(null)} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}>
                  <MaterialIcons name="close" size={20} color={colors.foreground} />
                </Pressable>
              </View>
              <Text style={[styles.modalEyebrow, { color: colors.muted }]}>{selectedListing.platform} · {selectedListing.location}</Text>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedListing.brand}</Text>
              <Text style={[styles.modalModel, { color: colors.muted }]}>{selectedListing.model}</Text>
              <View style={[styles.detailGrid, { borderColor: colors.border }]}>
                <DetailCell label="Asking" value={formatCurrency(selectedListing.askingPrice)} colors={colors} />
                <DetailCell label="Market value" value={formatCurrency(selectedListing.marketValue)} colors={colors} />
                <DetailCell label="Margin" value={`${selectedListing.margin.toFixed(1)}%`} colors={colors} />
                <DetailCell label="Condition" value={selectedListing.condition} colors={colors} />
              </View>
              <LayerLens listing={selectedListing} colors={colors} />
              <View style={styles.trustRow}>
                <MaterialIcons name={selectedListing.escrowProtected ? "verified-user" : "shield"} size={18} color={selectedListing.escrowProtected ? colors.success : colors.muted} />
                <Text style={[styles.trustText, { color: colors.foreground }]}>{selectedListing.escrowProtected ? "Escrow protected listing" : "Review seller protection before buying"}</Text>
              </View>
              <View style={styles.modalActions}>
                <Pressable onPress={() => toggleSaved(selectedListing)} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.pressed]}>
                  <MaterialIcons name={savedIds.includes(selectedListing.id) ? "bookmark" : "bookmark-border"} size={20} color={colors.foreground} />
                  <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{savedIds.includes(selectedListing.id) ? "Saved" : "Save deal"}</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(selectedListing.url)} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={[styles.primaryButtonText, { color: colors.foreground }]}>Open listing</Text>
                  <MaterialIcons name="north-east" size={18} color={colors.foreground} />
                </Pressable>
              </View>
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
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
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
        <View style={styles.prototypeColumn}><Text style={[styles.prototypeNumber, { color: colors.foreground }]}>1</Text><Text style={[styles.prototypeLabel, { color: colors.muted }]}>Visible</Text><Text style={[styles.prototypeValue, { color: colors.foreground }]}>{formatCurrency(listing.askingPrice)}</Text></View>
        <View style={[styles.prototypeDivider, { backgroundColor: colors.border }]} />
        <View style={styles.prototypeColumn}><Text style={[styles.prototypeNumber, { color: colors.foreground }]}>2</Text><Text style={[styles.prototypeLabel, { color: colors.muted }]}>Behavior</Text><Text style={[styles.prototypeValue, { color: colors.foreground }]}>{signals.inventoryPressure}</Text></View>
        <View style={[styles.prototypeDivider, { backgroundColor: colors.border }]} />
        <View style={styles.prototypeColumn}><Text style={[styles.prototypeNumber, { color: colors.foreground }]}>3</Text><Text style={[styles.prototypeLabel, { color: colors.muted }]}>Network</Text><Text style={[styles.prototypeValue, { color: colors.foreground }]}>{signals.networkMomentum}</Text></View>
      </View>
      <Text style={[styles.prototypeAction, { color: colors.foreground }]}>{signals.actionWindow}: <Text style={{ color: colors.muted }}>{signals.actionReason}</Text></Text>
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
          <Text style={[styles.price, { color: colors.foreground }]}>{formatCurrency(listing.askingPrice)}</Text>
        </View>
        <View style={styles.marginBlock}>
          <Text style={[styles.priceLabel, { color: colors.muted }]}>MARGIN</Text>
          <Text style={[styles.margin, { color: colors.success }]}>+{listing.margin.toFixed(1)}%</Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: colors.primary }]}>
          <Text style={[styles.scorePillText, { color: colors.foreground }]}>{listing.score}</Text>
          <Text style={[styles.scorePillLabel, { color: colors.foreground }]}>CHERRY</Text>
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
        <View style={[styles.actionBadge, { backgroundColor: colors.primary }]}><Text style={[styles.actionBadgeText, { color: colors.foreground }]}>{signals.actionWindow.toUpperCase()}</Text></View>
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
