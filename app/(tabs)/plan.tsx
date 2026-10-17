import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { DEFAULT_ECONOMICS, ECONOMICS_STORAGE_KEY, LISTINGS, PROFILES, formatCurrency, getListingEconomics, recommendAllocations, type EconomicsAssumptions, type Listing } from "@/lib/market-data";

const PLAN_STORAGE_KEY = "topCherry.capitalPlan";
const DEFAULT_BUDGET = 25000;

type AllocationMap = Record<string, number>;

const haptic = () => {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export default function PlanScreen() {
  const colors = useColors();
  const { candidate } = useLocalSearchParams<{ candidate?: string }>();
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [budgetText, setBudgetText] = useState(String(DEFAULT_BUDGET));
  const [allocations, setAllocations] = useState<AllocationMap>(() => recommendAllocations(DEFAULT_BUDGET));
  const [profileFilter, setProfileFilter] = useState("all");
  const [economics, setEconomics] = useState<EconomicsAssumptions>(DEFAULT_ECONOMICS);

  useEffect(() => {
    void AsyncStorage.getItem(ECONOMICS_STORAGE_KEY).then((raw) => {
      if (raw) setEconomics({ ...DEFAULT_ECONOMICS, ...(JSON.parse(raw) as Partial<EconomicsAssumptions>) });
    });
    void AsyncStorage.getItem(PLAN_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as { budget?: number; allocations?: AllocationMap };
      if (saved.budget) {
        setBudget(saved.budget);
        setBudgetText(String(saved.budget));
      }
      if (saved.allocations) setAllocations(saved.allocations);
      else setAllocations(recommendAllocations(saved.budget ?? DEFAULT_BUDGET, LISTINGS, economics));
    });
  }, [economics]);

  const visibleListings = useMemo(
    () => profileFilter === "all" ? LISTINGS : LISTINGS.filter((listing) => listing.profileSlug === profileFilter),
    [profileFilter],
  );
  const rows = LISTINGS.map((listing) => ({ listing, quantity: allocations[listing.id] ?? 0 }));
  const deployed = rows.reduce((sum, row) => sum + row.quantity * row.listing.askingPrice, 0);
  const upside = rows.reduce((sum, row) => sum + row.quantity * getListingEconomics(row.listing, economics).netUpside, 0);
  const remaining = budget - deployed;
  const selectedCount = rows.filter((row) => row.quantity > 0).length;
  const linkedCandidate = candidate ? LISTINGS.find((listing) => listing.id === candidate) : undefined;

  const persist = (nextBudget: number, nextAllocations: AllocationMap) => {
    void AsyncStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ budget: nextBudget, allocations: nextAllocations }));
  };

  const updateBudget = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setBudgetText(sanitized);
    const nextBudget = Math.max(0, Number(sanitized || 0));
    setBudget(nextBudget);
    const nextAllocations = recommendAllocations(nextBudget, LISTINGS, economics);
    setAllocations(nextAllocations);
    persist(nextBudget, nextAllocations);
  };

  const updateQuantity = (listing: Listing, delta: number) => {
    haptic();
    const current = allocations[listing.id] ?? 0;
    const otherDeployed = deployed - current * listing.askingPrice;
    const maxAffordable = Math.floor(Math.max(0, budget - otherDeployed) / listing.askingPrice);
    const nextQuantity = Math.max(0, Math.min(maxAffordable, current + delta));
    const next = { ...allocations, [listing.id]: nextQuantity };
    setAllocations(next);
    persist(budget, next);
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList
        data={visibleListings}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View>
          <View style={styles.header}><Text style={[styles.eyebrow, { color: colors.muted }]}>CAPITAL ALLOCATION</Text><Text style={[styles.title, { color: colors.foreground }]}>Pool your edge.</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Size each opportunity against one shared budget, not in isolation.</Text></View>
          <View style={[styles.budgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.budgetHeader}><View><Text style={[styles.cardEyebrow, { color: colors.muted }]}>TOTAL INVESTABLE CAPITAL</Text><Text style={[styles.budgetHint, { color: colors.muted }]}>How much are you putting to work?</Text></View><MaterialIcons name="account-balance-wallet" size={22} color={colors.primary} /></View><View style={[styles.budgetInputWrap, { backgroundColor: colors.background }]}><Text style={[styles.currency, { color: colors.muted }]}>$</Text><TextInput value={budgetText} onChangeText={updateBudget} keyboardType="number-pad" style={[styles.budgetInput, { color: colors.foreground }]} /></View></View>
          <View style={[styles.summaryCard, { backgroundColor: colors.foreground }]}><View style={styles.summaryTop}><Text style={[styles.summaryEyebrow, { color: colors.primary }]}>PLAN SUMMARY</Text><Text style={[styles.summaryCount, { color: colors.background }]}>{selectedCount} opportunities</Text></View><View style={styles.summaryNumbers}><SummaryStat label="Deployed" value={formatCurrency(deployed)} color={colors.background} /><SummaryStat label="Remaining" value={formatCurrency(Math.max(0, remaining))} color={colors.background} /><SummaryStat label="Proj. upside" value={`+${formatCurrency(Math.max(0, upside))}`} color={colors.primary} /></View><View style={styles.progressTrack}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(100, budget ? (deployed / budget) * 100 : 0)}%` }]} /></View><Text style={[styles.progressText, { color: colors.muted }]}>{budget ? `${((deployed / budget) * 100).toFixed(0)}% of capital allocated` : "Set a budget to begin"}</Text></View>
          {linkedCandidate ? <View style={[styles.linkedBanner, { backgroundColor: colors.surface, borderColor: colors.primary }]}><MaterialIcons name="link" size={17} color={colors.primary} /><View style={styles.linkedCopy}><Text style={[styles.linkedTitle, { color: colors.foreground }]}>Thesis candidate linked</Text><Text style={[styles.linkedText, { color: colors.muted }]}>{linkedCandidate.brand} {linkedCandidate.model} is highlighted below. Plan still checks shared-budget affordability and quantity.</Text></View></View> : null}
          <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Allocation opportunities</Text><Text style={[styles.sectionCaption, { color: colors.muted }]}>Quantity × opportunity cost</Text></View><Pressable onPress={() => { const next = recommendAllocations(budget); setAllocations(next); persist(budget, next); }}><Text style={[styles.resetText, { color: colors.primary }]}>Recalculate</Text></Pressable></View>
          <FlatList horizontal data={[{ slug: "all", name: "All" }, ...PROFILES]} keyExtractor={(item) => item.slug} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} renderItem={({ item }) => <Pressable onPress={() => setProfileFilter(item.slug)} style={[styles.chip, { backgroundColor: profileFilter === item.slug ? colors.foreground : colors.surface, borderColor: colors.border }]}><Text style={[styles.chipText, { color: profileFilter === item.slug ? colors.background : colors.muted }]}>{item.name}</Text></Pressable>} />
        </View>}
        renderItem={({ item }) => <AllocationCard listing={item} quantity={allocations[item.id] ?? 0} budget={budget} deployed={deployed} economics={economics} colors={colors} linked={item.id === candidate} onChange={(delta) => updateQuantity(item, delta)} />}
        ListFooterComponent={<View style={[styles.formulaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="calculate" size={19} color={colors.primary} /><View style={styles.formulaCopy}><Text style={[styles.formulaTitle, { color: colors.foreground }]}>How the plan is calculated</Text><Text style={[styles.formulaText, { color: colors.muted }]}>Net upside = market value − asking price − shipping − transaction fees − estimated travel cost. Opportunity cost shows the share of your total pool committed to each deal.</Text></View></View>}
      />
    </ScreenContainer>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.summaryStat}><Text style={[styles.summaryStatValue, { color }]}>{value}</Text><Text style={[styles.summaryStatLabel, { color: "#9AA597" }]}>{label}</Text></View>;
}

function AllocationCard({ listing, quantity, budget, deployed, economics, colors, linked = false, onChange }: { listing: Listing; quantity: number; budget: number; deployed: number; economics: EconomicsAssumptions; colors: ReturnType<typeof useColors>; linked?: boolean; onChange: (delta: number) => void }) {
  const capital = quantity * listing.askingPrice;
  const projectedUpside = quantity * getListingEconomics(listing, economics).netUpside;
  const opportunityCost = budget ? (capital / budget) * 100 : 0;
  const canAdd = deployed + listing.askingPrice <= budget;
  return <View style={[styles.allocationCard, { backgroundColor: colors.surface, borderColor: linked ? colors.primary : quantity > 0 ? colors.primary : colors.border }]}><View style={styles.allocationTop}><View style={styles.sourceRow}><View style={[styles.sourceIcon, { backgroundColor: colors.background }]}><Text style={[styles.sourceText, { color: colors.foreground }]}>{listing.platform.slice(0, 1)}</Text></View><View><Text style={[styles.platform, { color: colors.muted }]}>{listing.platform} · {listing.location}</Text><Text style={[styles.brand, { color: colors.foreground }]}>{listing.brand}</Text></View></View><View style={styles.scorePillWrap}>{linked ? <Text style={[styles.linkedLabel, { color: colors.primary }]}>THESIS LINK</Text> : null}<View style={[styles.scorePill, { backgroundColor: colors.primary }]}><Text style={[styles.score, { color: colors.foreground }]}>{listing.score}</Text><Text style={[styles.scoreLabel, { color: colors.foreground }]}>SCORE</Text></View></View></View><Text style={[styles.model, { color: colors.muted }]} numberOfLines={1}>{listing.model}</Text><View style={styles.mathRow}><View><Text style={[styles.mathLabel, { color: colors.muted }]}>UNIT COST</Text><Text style={[styles.mathValue, { color: colors.foreground }]}>{formatCurrency(listing.askingPrice)}</Text></View><View><Text style={[styles.mathLabel, { color: colors.muted }]}>UNIT UPSIDE</Text><Text style={[styles.mathValue, { color: colors.success }]}>+{formatCurrency(listing.marketValue - listing.askingPrice)}</Text></View><View style={styles.quantityControl}><Pressable onPress={() => onChange(-1)} disabled={quantity === 0} style={[styles.quantityButton, { backgroundColor: colors.background, opacity: quantity === 0 ? 0.35 : 1 }]}><Text style={[styles.quantityButtonText, { color: colors.foreground }]}>−</Text></Pressable><Text style={[styles.quantityText, { color: colors.foreground }]}>{quantity}</Text><Pressable onPress={() => onChange(1)} disabled={!canAdd} style={[styles.quantityButton, { backgroundColor: colors.primary, opacity: canAdd ? 1 : 0.35 }]}><Text style={[styles.quantityButtonText, { color: colors.foreground }]}>+</Text></Pressable></View></View><View style={[styles.allocationFooter, { borderTopColor: colors.border }]}><View><Text style={[styles.footerLabel, { color: colors.muted }]}>COMMITTED</Text><Text style={[styles.footerValue, { color: colors.foreground }]}>{formatCurrency(capital)}</Text></View><View><Text style={[styles.footerLabel, { color: colors.muted }]}>OPPORTUNITY COST</Text><Text style={[styles.footerValue, { color: colors.foreground }]}>{opportunityCost.toFixed(1)}%</Text></View><View style={styles.upsideBlock}><Text style={[styles.footerLabel, { color: colors.muted }]}>PLAN UPSIDE</Text><Text style={[styles.footerValue, { color: colors.success }]}>+{formatCurrency(projectedUpside)}</Text></View></View></View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  header: { paddingTop: 8, paddingBottom: 24 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  title: { fontSize: 34, fontWeight: "900", letterSpacing: -1.2, marginTop: 9 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 5, maxWidth: 320 },
  budgetCard: { borderRadius: 20, borderWidth: 1, padding: 15 },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardEyebrow: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  budgetHint: { fontSize: 11, marginTop: 3 },
  budgetInputWrap: { marginTop: 15, borderRadius: 15, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  currency: { fontSize: 25, fontWeight: "800" },
  budgetInput: { flex: 1, fontSize: 27, fontWeight: "800", paddingVertical: 10, paddingHorizontal: 7 },
  summaryCard: { borderRadius: 20, padding: 17, marginTop: 12 },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  summaryCount: { fontSize: 11, opacity: 0.65 },
  summaryNumbers: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  summaryStat: { flex: 1 },
  summaryStatValue: { fontSize: 17, fontWeight: "900" },
  summaryStatLabel: { fontSize: 10, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "#354035", marginTop: 19, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 10, marginTop: 8 },
  sectionHeader: { marginTop: 28, marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionCaption: { fontSize: 11, marginTop: 3 },
  linkedBanner: { borderRadius: 15, borderWidth: 1, padding: 11, flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 18 },
  linkedCopy: { flex: 1 },
  linkedTitle: { fontSize: 12, fontWeight: "900" },
  linkedText: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  resetText: { fontSize: 12, fontWeight: "800" },
  chips: { gap: 7, paddingBottom: 15 },
  chip: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontSize: 10, fontWeight: "700" },
  allocationCard: { borderRadius: 19, borderWidth: 1, padding: 14, marginBottom: 11 },
  allocationTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  sourceIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sourceText: { fontSize: 14, fontWeight: "900" },
  platform: { fontSize: 10, marginBottom: 2 },
  brand: { fontSize: 14, fontWeight: "800" },
  scorePill: { width: 48, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  scorePillWrap: { alignItems: "flex-end", gap: 3 },
  linkedLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.4 },
  score: { fontSize: 17, fontWeight: "900", lineHeight: 18 },
  scoreLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.4 },
  model: { fontSize: 13, fontWeight: "700", marginTop: 12 },
  mathRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 17, gap: 17 },
  mathLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 0.5 },
  mathValue: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: "auto" },
  quantityButton: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  quantityButtonText: { fontSize: 20, lineHeight: 22, fontWeight: "700" },
  quantityText: { width: 16, textAlign: "center", fontSize: 16, fontWeight: "900" },
  allocationFooter: { flexDirection: "row", borderTopWidth: 1, paddingTop: 12, marginTop: 14, gap: 13 },
  footerLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 0.4 },
  footerValue: { fontSize: 13, fontWeight: "800", marginTop: 3 },
  upsideBlock: { marginLeft: "auto", alignItems: "flex-end" },
  formulaCard: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", gap: 10, marginTop: 4 },
  formulaCopy: { flex: 1 },
  formulaTitle: { fontSize: 12, fontWeight: "800" },
  formulaText: { fontSize: 11, lineHeight: 17, marginTop: 4 },
});
