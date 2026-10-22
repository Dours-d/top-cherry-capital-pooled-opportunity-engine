import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { startOAuthLogin } from "@/constants/oauth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_ECONOMICS, ECONOMICS_STORAGE_KEY, formatCurrency, getObservationScheduleState, OBSERVATION_SCHEDULE_STORAGE_KEY, OUTCOME_STORAGE_KEY, OUTCOME_SYNC_DISMISSAL_STORAGE_KEY, OUTCOME_SYNC_QUEUE_STORAGE_KEY, type EconomicsAssumptions, type ListingOutcome } from "@/lib/market-data";
import { MARKETPLACE_SOURCES, PHASE_ONE_EBAY_TASKS, SOURCE_SYNC_SNAPSHOT } from "@/server/marketplace";
import { EbayMonitor } from "@/components/ebay-monitor";
import { ThesisDraftEditor } from "@/components/thesis-draft-editor";
import { mergeObservationReviews, normalizeObservationReview, type ObservationReview } from "@/shared/observation-reviews";
import { mergeListingOutcomes } from "@/shared/listing-outcomes";
import { dismissPendingOutcome, restoreDismissedOutcome as restoreDismissedOutcomeTransition, type OutcomeSyncDismissal, type PendingOutcomeRecord } from "@/shared/outcome-sync-queue";

const EBAY_READINESS_KEY = "topCherry.ebayReadiness";
const OBSERVATION_REVIEW_STORAGE_KEY = "topCherry.observationReviews";
const EBAY_READINESS_ITEMS = [
  { id: "browse", label: "Verify read-only Browse access", detail: "Application-token search is verified for EBAY_GB.", state: "DONE" },
  { id: "details", label: "Verify item-detail characteristics", detail: "getItem PRODUCT details are requested when a live listing opens.", state: "DONE" },
  { id: "disclosure", label: "Add outbound affiliate disclosure", detail: "Live eBay links preserve itemAffiliateWebUrl and show a disclosure first.", state: "DONE" },
  { id: "epn", label: "Join eBay Partner Network", detail: "Complete the account, promotional property, currency and agreement sections.", state: "NEXT", url: "https://partnernetwork.ebay.com/solutions/joining-the-ebay-partner-network" },
  { id: "growth", label: "Prepare Application Growth Check", detail: "Submit the Sandbox journey, data flow, retention controls and production use case.", state: "NEXT", url: "https://developer.ebay.com/develop/get-started/application-growth-check" },
  { id: "topics", label: "Request listing notification topics", detail: "Price revision and availability remain separate approved-partner scopes.", state: "GATED", url: "https://developer.ebay.com/develop/api/buy/notification_events" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();
  const preferencesQuery = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const updatePreferences = trpc.preferences.update.useMutation({ onSuccess: () => void preferencesQuery.refetch() });
  const remoteReviews = trpc.observationReviews.list.useQuery(undefined, { enabled: isAuthenticated });
  const remoteOutcomes = trpc.listingOutcomes.list.useQuery(undefined, { enabled: isAuthenticated });
  const syncReview = trpc.observationReviews.upsert.useMutation();
  const syncOutcome = trpc.listingOutcomes.upsert.useMutation();
  const [alerts, setAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [economics, setEconomics] = useState(DEFAULT_ECONOMICS);
  const [ebayReadiness, setEbayReadiness] = useState<Record<string, boolean>>({});
  const [followUps, setFollowUps] = useState<{ listingId: string; nextObserveAt: string; listingTitle?: string; platform?: string; askingPrice?: number; currency?: string }[]>([]);
  const [followUpOutcomes, setFollowUpOutcomes] = useState<ListingOutcome[]>([]);
  const [recentReviews, setRecentReviews] = useState<ObservationReview[]>([]);
  const [pendingOutcomeSyncs, setPendingOutcomeSyncs] = useState(0);
  const [pendingOutcomeRecords, setPendingOutcomeRecords] = useState<PendingOutcomeRecord[]>([]);
  const [dismissedOutcomeRecords, setDismissedOutcomeRecords] = useState<OutcomeSyncDismissal[]>([]);
  const [autoRetryAttempted, setAutoRetryAttempted] = useState(false);

  useEffect(() => {
    if (preferencesQuery.data) {
      setAlerts(preferencesQuery.data.alertsEnabled);
      setDailyDigest(preferencesQuery.data.dailyDigest);
    }
  }, [preferencesQuery.data]);

  useEffect(() => {
    void AsyncStorage.getItem(ECONOMICS_STORAGE_KEY).then((raw) => {
      if (raw) setEconomics({ ...DEFAULT_ECONOMICS, ...(JSON.parse(raw) as Partial<EconomicsAssumptions>) });
    });
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(EBAY_READINESS_KEY).then((raw) => {
      if (raw) setEbayReadiness(JSON.parse(raw) as Record<string, boolean>);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void Promise.all([AsyncStorage.getItem(OBSERVATION_SCHEDULE_STORAGE_KEY), AsyncStorage.getItem(OUTCOME_STORAGE_KEY), AsyncStorage.getItem(OBSERVATION_REVIEW_STORAGE_KEY), AsyncStorage.getItem(OUTCOME_SYNC_QUEUE_STORAGE_KEY), AsyncStorage.getItem(OUTCOME_SYNC_DISMISSAL_STORAGE_KEY)]).then(([scheduleRaw, outcomesRaw, reviewsRaw, pendingRaw, dismissalRaw]) => {
      try {
        const schedules = scheduleRaw ? JSON.parse(scheduleRaw) as Record<string, string | { nextObserveAt: string }> : {};
        setFollowUps(Object.entries(schedules).map(([listingId, value]) => typeof value === "string" ? { listingId, nextObserveAt: value } : { listingId, ...value }).filter((item) => item.nextObserveAt).sort((a, b) => new Date(a.nextObserveAt).getTime() - new Date(b.nextObserveAt).getTime()));
      } catch { setFollowUps([]); }
      try { setFollowUpOutcomes(outcomesRaw ? JSON.parse(outcomesRaw) as ListingOutcome[] : []); } catch { setFollowUpOutcomes([]); }
      try { const pending = pendingRaw ? JSON.parse(pendingRaw) as PendingOutcomeRecord[] : []; setPendingOutcomeRecords(pending.filter((item) => typeof item.id === "string" && typeof item.listingId === "string")); setPendingOutcomeSyncs(pending.length); } catch { setPendingOutcomeRecords([]); setPendingOutcomeSyncs(0); }
      try { const dismissals = dismissalRaw ? JSON.parse(dismissalRaw) as OutcomeSyncDismissal[] : []; setDismissedOutcomeRecords(dismissals.filter((item) => typeof item.outcomeId === "string" && typeof item.clearedAt === "string" && typeof item.note === "string").slice(0, 50)); } catch { setDismissedOutcomeRecords([]); }
      try {
        const parsed = reviewsRaw ? JSON.parse(reviewsRaw) as Partial<ObservationReview>[] : [];
        setRecentReviews(parsed.filter((review): review is Partial<ObservationReview> & Pick<ObservationReview, "listingId" | "reviewedAt"> => typeof review.listingId === "string" && typeof review.reviewedAt === "string").map(normalizeObservationReview).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)).slice(0, 20));
      } catch { setRecentReviews([]); }
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !remoteReviews.data?.length) return;
    const remote = remoteReviews.data.map((review) => ({ ...review, reviewedAt: new Date(review.reviewedAt).toISOString() })) as ObservationReview[];
    const merged = mergeObservationReviews(recentReviews, remote);
    if (JSON.stringify(merged) !== JSON.stringify(recentReviews)) {
      setRecentReviews(merged);
      void AsyncStorage.setItem(OBSERVATION_REVIEW_STORAGE_KEY, JSON.stringify(merged));
    }
  }, [isAuthenticated, remoteReviews.data, recentReviews]);

  useEffect(() => {
    if (!isAuthenticated || !remoteOutcomes.data?.length) return;
    const remote = remoteOutcomes.data.map((outcome) => ({ id: outcome.outcomeId, listingId: outcome.listingId, kind: outcome.kind, observedAt: new Date(outcome.observedAt).toISOString(), ...(outcome.realizedPrice === null ? {} : { realizedPrice: outcome.realizedPrice }), ...(outcome.currency ? { currency: outcome.currency } : {}), ...(outcome.note ? { note: outcome.note } : {}) })) as ListingOutcome[];
    const merged = mergeListingOutcomes(followUpOutcomes, remote);
    if (JSON.stringify(merged) !== JSON.stringify(followUpOutcomes)) {
      setFollowUpOutcomes(merged);
      void AsyncStorage.setItem(OUTCOME_STORAGE_KEY, JSON.stringify(merged));
    }
  }, [isAuthenticated, remoteOutcomes.data, followUpOutcomes]);

  const updateEconomics = (patch: Partial<EconomicsAssumptions>) => {
    const next = { ...economics, ...patch };
    setEconomics(next);
    void AsyncStorage.setItem(ECONOMICS_STORAGE_KEY, JSON.stringify(next));
  };

  const toggle = (key: "alertsEnabled" | "dailyDigest", setter: (value: boolean) => void, value: boolean) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !value;
    setter(next);
    if (isAuthenticated) updatePreferences.mutate({ [key]: next });
  };

  const retryPendingOutcomeSync = async () => {
    if (!isAuthenticated || !pendingOutcomeRecords.length) return;
    const remaining: PendingOutcomeRecord[] = [];
    for (const outcome of pendingOutcomeRecords) {
      try {
        await syncOutcome.mutateAsync({ outcomeId: outcome.id, listingId: outcome.listingId, kind: outcome.kind, observedAt: outcome.observedAt, ...(outcome.realizedPrice === undefined ? {} : { realizedPrice: outcome.realizedPrice }), ...(outcome.currency ? { currency: outcome.currency } : {}), ...(outcome.note ? { note: outcome.note } : {}) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "The server rejected this sync attempt.";
        remaining.push({ ...outcome, syncError: message, lastAttemptAt: new Date().toISOString() });
      }
    }
    setPendingOutcomeRecords(remaining);
    setPendingOutcomeSyncs(remaining.length);
    await AsyncStorage.setItem(OUTCOME_SYNC_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
  };

  const clearPendingOutcome = async (outcomeId: string, note: string) => {
    const result = dismissPendingOutcome(pendingOutcomeRecords, dismissedOutcomeRecords, outcomeId, note, new Date().toISOString());
    if (!result) return;
    setDismissedOutcomeRecords(result.dismissals);
    setPendingOutcomeRecords(result.pending);
    setPendingOutcomeSyncs(result.pending.length);
    await AsyncStorage.setItem(OUTCOME_SYNC_QUEUE_STORAGE_KEY, JSON.stringify(result.pending));
    await AsyncStorage.setItem(OUTCOME_SYNC_DISMISSAL_STORAGE_KEY, JSON.stringify(result.dismissals));
  };

  const restoreDismissedOutcome = async (outcomeId: string, note: string) => {
    const result = restoreDismissedOutcomeTransition(pendingOutcomeRecords, dismissedOutcomeRecords, followUpOutcomes, outcomeId, note, new Date().toISOString());
    if (!result) return;
    setPendingOutcomeRecords(result.pending);
    setPendingOutcomeSyncs(result.pending.length);
    setDismissedOutcomeRecords(result.dismissals);
    await AsyncStorage.setItem(OUTCOME_SYNC_QUEUE_STORAGE_KEY, JSON.stringify(result.pending));
    await AsyncStorage.setItem(OUTCOME_SYNC_DISMISSAL_STORAGE_KEY, JSON.stringify(result.dismissals));
  };

  useEffect(() => {
    if (!isAuthenticated || autoRetryAttempted || !pendingOutcomeRecords.length) return;
    setAutoRetryAttempted(true);
    void retryPendingOutcomeSync();
  }, [isAuthenticated, pendingOutcomeRecords.length, autoRetryAttempted]);

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={[styles.eyebrow, { color: colors.muted }]}>ACCOUNT & PREFERENCES</Text><Text style={[styles.title, { color: colors.foreground }]}>Your workspace</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Tune Top Cherry around the markets you actually trade.</Text></View>
        {isAuthenticated ? <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={[styles.avatarText, { color: colors.onPrimary }]}>{(user?.name ?? "AR").slice(0, 2).toUpperCase()}</Text></View><View style={styles.profileCopy}><Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name ?? "Top Cherry member"}</Text><Text style={[styles.profileEmail, { color: colors.muted }]}>{user?.email ?? "Synced account"}</Text></View><Pressable onPress={() => void logout()}><Text style={[styles.logoutText, { color: colors.primary }]}>Log out</Text></Pressable></View> : <Pressable onPress={() => void startOAuthLogin()} style={({ pressed }) => [styles.loginCard, { backgroundColor: colors.primary }, pressed && styles.pressed]}><View style={styles.loginCopy}><Text style={[styles.loginTitle, { color: colors.onPrimary }]}>Sync your workspace</Text><Text style={[styles.loginText, { color: colors.onPrimary }]}>Sign in to keep saves and allocation preferences across devices.</Text></View><MaterialIcons name="arrow-forward" size={21} color={colors.onPrimary} /></Pressable>}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Research thesis</Text>
        <ThesisDraftEditor />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notification monitor</Text>
        <EbayMonitor />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Research follow-ups</Text>
        <ObservationFollowUpQueue colors={colors} followUps={followUps} outcomes={followUpOutcomes} recentReviews={recentReviews} onMarkReviewed={(listingId, note) => {
          const context = followUps.find((item) => item.listingId === listingId);
          const review = { reviewId: `${listingId}:${Date.now()}`, listingId, reviewedAt: new Date().toISOString(), ...(note ? { note } : {}), listingTitle: context?.listingTitle, platform: context?.platform, askingPrice: context?.askingPrice, currency: context?.currency };
          const nextReviews = [review, ...recentReviews.filter((item) => item.listingId !== listingId)].slice(0, 20);
          setRecentReviews(nextReviews);
          void AsyncStorage.setItem(OBSERVATION_REVIEW_STORAGE_KEY, JSON.stringify(nextReviews));
          if (isAuthenticated) void syncReview.mutateAsync(review).catch(() => undefined);
          setFollowUps((current) => current.filter((item) => item.listingId !== listingId));
          void AsyncStorage.getItem(OBSERVATION_SCHEDULE_STORAGE_KEY).then((raw) => {
            try {
              const schedules = raw ? JSON.parse(raw) as Record<string, unknown> : {};
              delete schedules[listingId];
              return AsyncStorage.setItem(OBSERVATION_SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
            } catch { return undefined; }
          });
        }} />
        <SyncedOutcomeHistory colors={colors} outcomes={followUpOutcomes} authenticated={isAuthenticated} pendingSyncs={pendingOutcomeSyncs} pendingRecords={pendingOutcomeRecords} dismissedRecords={dismissedOutcomeRecords} onRetryPending={() => void retryPendingOutcomeSync()} onClearPending={(outcomeId, note) => void clearPendingOutcome(outcomeId, note)} onRestorePending={(outcomeId, note) => void restoreDismissedOutcome(outcomeId, note)} retrying={syncOutcome.isPending} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>eBay authorization readiness</Text>
        <EbayReadinessChecklist colors={colors} completed={ebayReadiness} onToggle={(id) => {
          const next = { ...ebayReadiness, [id]: !ebayReadiness[id] };
          setEbayReadiness(next);
          void AsyncStorage.setItem(EBAY_READINESS_KEY, JSON.stringify(next));
        }} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alerts</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow icon="notifications-active" title="Opportunity alerts" description="When a score and margin clear your thresholds" value={alerts} onChange={() => toggle("alertsEnabled", setAlerts, alerts)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow icon="today" title="Daily digest" description="A calm 8am recap of new edges" value={dailyDigest} onChange={() => toggle("dailyDigest", setDailyDigest, dailyDigest)} colors={colors} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Preferences</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActionRow icon="tune" title="Scoring methodology" detail="Margin, trust, and condition" onPress={() => Alert.alert("Cherry Score", "Margin, condition risk, and escrow trust combine into a 0–100 score.")} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ActionRow icon="sync" title="Marketplace sources" detail="Adapters ready · credentials required" onPress={() => Alert.alert("Marketplace sources", "Chrono24, eBay, MPB, and Goldin adapters are ready for provider credentials.")} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ActionRow icon="help-outline" title="Help center" detail="Get support" onPress={() => Linking.openURL("https://help.manus.im")} colors={colors} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Deal assumptions</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActionRow icon="home" title="Home country" detail={`${economics.homeCountry} · used for pickup context`} onPress={() => Alert.prompt("Home country", "Enter a two-letter country code", (value) => { if (value?.trim()) updateEconomics({ homeCountry: value.trim().toUpperCase().slice(0, 2) }); }, "plain-text", economics.homeCountry)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ActionRow icon="percent" title="Transaction fee" detail={`${Math.round(economics.transactionFeeRate * 100)}% of asking price`} onPress={() => Alert.prompt("Transaction fee", "Enter a percentage", (value) => { const parsed = Number(value); if (Number.isFinite(parsed)) updateEconomics({ transactionFeeRate: Math.max(0, Math.min(20, parsed / 100)) }); }, "plain-text", String(Math.round(economics.transactionFeeRate * 100)))} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ActionRow icon="directions-car" title="Travel cost" detail={`$${economics.travelCostPerKm.toFixed(2)} per pickup km`} onPress={() => Alert.prompt("Travel cost", "Enter cost per kilometer", (value) => { const parsed = Number(value); if (Number.isFinite(parsed)) updateEconomics({ travelCostPerKm: Math.max(0, parsed) }); }, "plain-text", economics.travelCostPerKm.toFixed(2))} colors={colors} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data control</Text>
        <View style={[styles.dataCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.dataHeader}>
            <View style={[styles.dataIcon, { backgroundColor: colors.background }]}><MaterialIcons name="dataset" size={19} color={colors.primary} /></View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Sample data mode</Text>
              <Text style={[styles.settingDescription, { color: colors.muted }]}>Listing feed is sample data. Webhook delivery is tracked separately.</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.warning }]}><Text style={[styles.statusBadgeText, { color: colors.foreground }]}>SAMPLE</Text></View>
          </View>
          <Text style={[styles.dataNote, { color: colors.muted }]}>Counts and opportunities remain clearly separated from future live imports until a source has completed its first verified sync.</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.rolloutTitle, { color: colors.foreground }]}>Phase 1 · eBay Browse API</Text>
          <Text style={[styles.rolloutSubtitle, { color: colors.muted }]}>Production access and first live import</Text>
          {PHASE_ONE_EBAY_TASKS.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <MaterialIcons name={task.state === "done" ? "check-circle" : task.state === "blocked" ? "lock" : task.state === "in-progress" ? "radio-button-checked" : "radio-button-unchecked"} size={17} color={task.state === "blocked" ? colors.warning : task.state === "done" ? colors.success : task.state === "in-progress" ? colors.primary : colors.muted} />
              <Text style={[styles.taskLabel, { color: colors.foreground }]}>{task.label}</Text>
              <Text style={[styles.taskState, { color: task.state === "blocked" ? colors.warning : colors.muted }]}>{task.state === "in-progress" ? "ACTIVE" : task.state.toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Connector registry</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {MARKETPLACE_SOURCES.map((source, index) => {
            const snapshot = SOURCE_SYNC_SNAPSHOT.find((item) => item.sourceSlug === source.slug);
            return <View key={source.slug} style={styles.connectorRow}><View style={[styles.connectorDot, { backgroundColor: snapshot?.state === "synced" ? colors.success : colors.warning }]} /><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{source.name}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{snapshot?.message ?? "Awaiting connector configuration"}</Text></View><Text style={[styles.taskState, { color: colors.muted }]}>{snapshot?.recordCount ?? 0}</Text>{index < MARKETPLACE_SOURCES.length - 1 ? <View style={[styles.connectorDivider, { backgroundColor: colors.border }]} /> : null}</View>;
          })}
        </View>
        <Text style={[styles.footerText, { color: colors.muted }]}>Top Cherry · Built for better buys</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function ObservationFollowUpQueue({ colors, followUps, outcomes, recentReviews, onMarkReviewed }: { colors: ReturnType<typeof useColors>; followUps: { listingId: string; nextObserveAt: string; listingTitle?: string; platform?: string; askingPrice?: number; currency?: string }[]; outcomes: ListingOutcome[]; recentReviews: ObservationReview[]; onMarkReviewed: (listingId: string, note?: string) => void }) {
  const [reviewNote, setReviewNote] = useState("");
  const [filter, setFilter] = useState<"active" | "due" | "reviewed">("active");
  const dueCount = followUps.filter((item) => { const state = getObservationScheduleState(item.nextObserveAt); return state === "due" || state === "overdue"; }).length;
  const visibleFollowUps = filter === "due" ? followUps.filter((item) => { const state = getObservationScheduleState(item.nextObserveAt); return state === "due" || state === "overdue"; }) : filter === "active" ? followUps : [];
  return <View style={[styles.followUpCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.readinessHeader}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Observation queue</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{followUps.length ? `${dueCount} due · ${followUps.length} scheduled` : "No local follow-ups scheduled"}</Text></View><View style={[styles.statusBadge, { backgroundColor: dueCount ? colors.warning : colors.background }]}><Text style={[styles.statusBadgeText, { color: dueCount ? colors.foreground : colors.muted }]}>{dueCount ? "REVIEW" : "QUIET"}</Text></View></View>
    <Text style={[styles.dataNote, { color: colors.muted }]}>This queue is a reminder to refresh and record evidence. It does not mean that a marketplace listing was fetched or that an outcome occurred. Marking an item reviewed only acknowledges the reminder.</Text>
    <View style={styles.filterRow}>{(["active", "due", "reviewed"] as const).map((option) => <Pressable key={option} onPress={() => setFilter(option)} style={({ pressed }) => [styles.filterChip, { backgroundColor: filter === option ? colors.foreground : colors.background, borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.filterChipText, { color: filter === option ? colors.background : colors.muted }]}>{option === "active" ? `Active (${followUps.length})` : option === "due" ? `Due (${dueCount})` : `Reviewed (${recentReviews.length})`}</Text></Pressable>)}</View>
    {filter !== "reviewed" && visibleFollowUps.length ? <><TextInput value={reviewNote} onChangeText={setReviewNote} placeholder="Optional review note" placeholderTextColor={colors.muted} style={[styles.reviewNoteInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} /><Text style={[styles.dataNote, { color: colors.muted }]}>This note records your acknowledgment context only; it does not establish a sale, price change, or market fact.</Text>{visibleFollowUps.slice(0, 8).map((item, index) => {
      const state = getObservationScheduleState(item.nextObserveAt);
      const latest = outcomes.filter((outcome) => outcome.listingId === item.listingId).sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
      return <View key={item.listingId} style={styles.followUpRow}><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/", params: { focusListingId: item.listingId, focusQuery: item.listingTitle ?? item.listingId } })} style={({ pressed }) => [styles.followUpMain, pressed && styles.pressed]}><MaterialIcons name={state === "overdue" ? "warning" : state === "due" ? "schedule" : "event-note"} size={18} color={state === "overdue" || state === "due" ? colors.warning : colors.primary} /><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]} numberOfLines={1}>{item.listingTitle ?? item.listingId}</Text><Text style={[styles.settingDescription, { color: colors.muted }]} numberOfLines={1}>{item.platform ?? "Marketplace"}{item.askingPrice !== undefined ? ` · ${formatCurrency(item.askingPrice, item.currency)}` : " · asking price unavailable"}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{state === "overdue" ? "Overdue" : state === "due" ? "Due now" : `Due ${new Date(item.nextObserveAt).toLocaleString()}`}{latest ? ` · last ${latest.kind}` : " · no outcome recorded"}</Text></View><MaterialIcons name="chevron-right" size={18} color={colors.muted} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Mark ${item.listingTitle ?? item.listingId} reviewed`} onPress={() => { onMarkReviewed(item.listingId, reviewNote.trim() || undefined); setReviewNote(""); }} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>Mark reviewed</Text></Pressable>{index < Math.min(followUps.length, 8) - 1 ? <View style={[styles.connectorDivider, { backgroundColor: colors.border }]} /> : null}</View>;
    })}</> : filter === "reviewed" ? <View style={styles.reviewHistory}>{recentReviews.length ? recentReviews.slice(0, 8).map((review) => <View key={`${review.listingId}-${review.reviewedAt}`} style={styles.reviewHistoryRow}><MaterialIcons name="done" size={14} color={colors.success} /><View style={styles.settingCopy}><Text style={[styles.settingDescription, { color: colors.muted }]} numberOfLines={1}>{review.listingId} · acknowledged {new Date(review.reviewedAt).toLocaleString()}</Text>{review.note ? <Text style={[styles.reviewNoteText, { color: colors.foreground }]} numberOfLines={2}>“{review.note}”</Text> : null}</View></View>) : <Text style={[styles.dataNote, { color: colors.muted }]}>No reviewed follow-ups recorded yet.</Text>}</View> : <Text style={[styles.dataNote, { color: colors.muted }]}>No follow-ups match this filter.</Text>}
  </View>;
}

function SyncedOutcomeHistory({ colors, outcomes, authenticated, pendingSyncs, pendingRecords, dismissedRecords, onRetryPending, onClearPending, onRestorePending, retrying }: { colors: ReturnType<typeof useColors>; outcomes: ListingOutcome[]; authenticated: boolean; pendingSyncs: number; pendingRecords: PendingOutcomeRecord[]; dismissedRecords: OutcomeSyncDismissal[]; onRetryPending: () => void; onClearPending: (outcomeId: string, note: string) => void; onRestorePending: (outcomeId: string, note: string) => void; retrying: boolean }) {
  const [clearTarget, setClearTarget] = useState<string | null>(null);
  const [clearNote, setClearNote] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "synced" | "dismissed">("all");
  const visiblePending = statusFilter === "all" || statusFilter === "pending" ? pendingRecords : [];
  const visibleOutcomes = statusFilter === "all" || statusFilter === "synced" ? outcomes : [];
  const visibleDismissals = statusFilter === "all" || statusFilter === "dismissed" ? dismissedRecords : [];
  return <View style={[styles.outcomeHistoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.readinessHeader}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Outcome evidence history</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{authenticated ? `${outcomes.length} local/server observations reconciled` : `${outcomes.length} local observations`}{pendingSyncs ? ` · ${pendingSyncs} pending sync` : ""}</Text></View><MaterialIcons name="fact-check" size={20} color={colors.primary} /></View>
    <Text style={[styles.dataNote, { color: colors.muted }]}>These are recorded observations, not verified market value, forecasts, or execution instructions. A realized price is evidence attached to an event, not an automatic benchmark.</Text>
    <View style={styles.filterRow}>{(["all", "pending", "synced", "dismissed"] as const).map((option) => <Pressable key={option} onPress={() => setStatusFilter(option)} style={({ pressed }) => [styles.filterChip, { backgroundColor: statusFilter === option ? colors.foreground : colors.background, borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.filterChipText, { color: statusFilter === option ? colors.background : colors.muted }]}>{option === "all" ? `All (${outcomes.length + pendingRecords.length + dismissedRecords.length})` : option === "pending" ? `Pending (${pendingRecords.length})` : option === "synced" ? `Synced (${outcomes.length})` : `Dismissed (${dismissedRecords.length})`}</Text></Pressable>)}</View>
    {authenticated && visiblePending.length ? <Pressable onPress={onRetryPending} disabled={retrying} style={({ pressed }) => [styles.retryAllButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.retryAllText, { color: colors.onPrimary }]}>{retrying ? "Retrying pending syncs…" : `Retry all pending (${visiblePending.length})`}</Text></Pressable> : null}
    {visiblePending.map((record) => <View key={`pending-${record.id}`} style={styles.pendingSyncRow}><MaterialIcons name="cloud-off" size={14} color={colors.warning} /><View style={styles.settingCopy}><Text style={[styles.settingDescription, { color: colors.foreground }]} numberOfLines={1}>{record.listingId} · pending synchronization</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{record.lastAttemptAt ? `Last attempt ${new Date(record.lastAttemptAt).toLocaleString()}` : "Not attempted yet"}</Text>{record.syncError ? <Text style={[styles.syncErrorText, { color: colors.warning }]} numberOfLines={2}>Reason: {record.syncError}</Text> : null}{clearTarget === record.id ? <><TextInput value={clearNote} onChangeText={setClearNote} placeholder="Required audit note" placeholderTextColor={colors.muted} style={[styles.clearNoteInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} /><View style={styles.clearActionRow}><Pressable onPress={() => { onClearPending(record.id, clearNote); setClearTarget(null); setClearNote(""); }} disabled={!clearNote.trim()} style={({ pressed }) => [styles.clearConfirmButton, { backgroundColor: clearNote.trim() ? colors.warning : colors.border }, pressed && styles.pressed]}><Text style={[styles.clearConfirmText, { color: colors.foreground }]}>Clear with note</Text></Pressable><Pressable onPress={() => { setClearTarget(null); setClearNote(""); }} style={({ pressed }) => [styles.clearCancelButton, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>Cancel</Text></Pressable></View></> : <Pressable onPress={() => setClearTarget(record.id)} style={({ pressed }) => [styles.clearLink, pressed && styles.pressed]}><Text style={[styles.clearLinkText, { color: colors.warning }]}>Clear failed record</Text></Pressable>}</View></View>)}
    {visibleDismissals.length ? <View style={styles.dismissalHistory}><Text style={[styles.dismissalTitle, { color: colors.muted }]}>Dismissed sync records · audit history</Text>{visibleDismissals.slice(0, 8).map((record) => <View key={`${record.outcomeId}-${record.clearedAt}`} style={styles.dismissalRow}><MaterialIcons name="do-not-disturb-on" size={14} color={colors.muted} /><View style={styles.settingCopy}><Text style={[styles.settingDescription, { color: colors.foreground }]} numberOfLines={1}>{record.outcomeId} · intentionally cleared</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{new Date(record.clearedAt).toLocaleString()}</Text><Text style={[styles.reviewNoteText, { color: colors.muted }]} numberOfLines={2}>Audit note: “{record.note}”</Text>{record.restoredAt ? <Text style={[styles.reviewNoteText, { color: colors.warning }]} numberOfLines={2}>Restored to pending {new Date(record.restoredAt).toLocaleString()} · “{record.restoreNote}”</Text> : restoreTarget === record.outcomeId ? <><TextInput value={restoreNote} onChangeText={setRestoreNote} placeholder="Required restore note" placeholderTextColor={colors.muted} style={[styles.clearNoteInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} /><View style={styles.clearActionRow}><Pressable onPress={() => { onRestorePending(record.outcomeId, restoreNote); setRestoreTarget(null); setRestoreNote(""); }} disabled={!restoreNote.trim()} style={({ pressed }) => [styles.clearConfirmButton, { backgroundColor: restoreNote.trim() ? colors.warning : colors.border }, pressed && styles.pressed]}><Text style={[styles.clearConfirmText, { color: colors.foreground }]}>Restore to pending</Text></Pressable><Pressable onPress={() => { setRestoreTarget(null); setRestoreNote(""); }} style={({ pressed }) => [styles.clearCancelButton, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>Cancel</Text></Pressable></View></> : <Pressable onPress={() => setRestoreTarget(record.outcomeId)} style={({ pressed }) => [styles.clearLink, pressed && styles.pressed]}><Text style={[styles.clearLinkText, { color: colors.warning }]}>Restore to pending</Text></Pressable>}</View></View>)}</View> : null}
    {visibleOutcomes.length ? visibleOutcomes.slice(0, 8).map((outcome) => <View key={outcome.id} style={styles.outcomeHistoryRow}><MaterialIcons name="radio-button-checked" size={14} color={colors.primary} /><View style={styles.settingCopy}><Text style={[styles.settingDescription, { color: colors.foreground }]} numberOfLines={1}>{outcome.listingId} · {outcome.kind}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{new Date(outcome.observedAt).toLocaleString()}{outcome.realizedPrice !== undefined ? ` · observed ${formatCurrency(outcome.realizedPrice, outcome.currency)}` : ""}</Text>{outcome.note ? <Text style={[styles.reviewNoteText, { color: colors.muted }]} numberOfLines={2}>“{outcome.note}”</Text> : null}</View></View>) : !visiblePending.length && !visibleDismissals.length ? <Text style={[styles.dataNote, { color: colors.muted }]}>{statusFilter === "all" ? "No outcome records have been recorded yet." : `No ${statusFilter} records.`}</Text> : null}
  </View>;
}

function EbayReadinessChecklist({ colors, completed, onToggle }: { colors: ReturnType<typeof useColors>; completed: Record<string, boolean>; onToggle: (id: string) => void }) {
  const doneCount = EBAY_READINESS_ITEMS.filter((item) => item.state === "DONE" || completed[item.id]).length;
  return <View style={[styles.readinessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.readinessHeader}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Provider gate tracker</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{doneCount}/{EBAY_READINESS_ITEMS.length} recorded · completion does not grant eBay approval</Text></View><View style={[styles.statusBadge, { backgroundColor: colors.warning }]}><Text style={[styles.statusBadgeText, { color: colors.onPrimary }]}>NOT APPROVED</Text></View></View>
    <Text style={[styles.dataNote, { color: colors.muted }]}>Use this as an evidence checklist for EPN and the Application Growth Check. It never stores credentials or submits an application.</Text>
    {EBAY_READINESS_ITEMS.map((item, index) => {
      const isDone = item.state === "DONE" || Boolean(completed[item.id]);
      return <View key={item.id} style={styles.readinessItem}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isDone }} onPress={() => onToggle(item.id)} style={({ pressed }) => [styles.readinessCheck, pressed && styles.pressed]}><MaterialIcons name={isDone ? "check-circle" : item.state === "GATED" ? "lock" : "radio-button-unchecked"} size={19} color={isDone ? colors.success : item.state === "GATED" ? colors.warning : colors.muted} /></Pressable>
        <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{item.detail}</Text></View>
        {item.url ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.url)} style={({ pressed }) => [styles.readinessLink, pressed && styles.pressed]}><Text style={[styles.readinessLinkText, { color: colors.primary }]}>Open</Text></Pressable> : <Text style={[styles.taskState, { color: isDone ? colors.success : colors.muted }]}>{isDone ? "DONE" : item.state}</Text>}
        {index < EBAY_READINESS_ITEMS.length - 1 ? <View style={[styles.connectorDivider, { backgroundColor: colors.border }]} /> : null}
      </View>;
    })}
  </View>;
}

function SettingRow({ icon, title, description, value, onChange, colors }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; description: string; value: boolean; onChange: () => void; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.settingRow}><View style={[styles.settingIcon, { backgroundColor: colors.background }]}><MaterialIcons name={icon} size={19} color={colors.primary} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{description}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={value ? colors.foreground : colors.muted} /></View>;
}

function ActionRow({ icon, title, detail, onPress, colors }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}><View style={[styles.settingIcon, { backgroundColor: colors.background }]}><MaterialIcons name={icon} size={19} color={colors.primary} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{detail}</Text></View><MaterialIcons name="chevron-right" size={20} color={colors.muted} /></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  header: { paddingTop: 8, paddingBottom: 25 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  title: { fontSize: 34, fontWeight: "900", letterSpacing: -1.2, marginTop: 9 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 5, maxWidth: 300 },
  profileCard: { borderRadius: 20, borderWidth: 1, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 30 },
  avatar: { width: 49, height: 49, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontWeight: "900" },
  profileCopy: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 16, fontWeight: "800" },
  profileEmail: { fontSize: 12, marginTop: 3 },
  logoutText: { fontSize: 11, fontWeight: "800" },
  loginCard: { borderRadius: 20, padding: 17, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 30 },
  loginCopy: { flex: 1 },
  loginTitle: { fontSize: 16, fontWeight: "900" },
  loginText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 11 },
  settingsCard: { borderRadius: 19, borderWidth: 1, paddingHorizontal: 14, marginBottom: 27 },
  settingRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 11 },
  settingIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: "700" },
  settingDescription: { fontSize: 11, marginTop: 3 },
  divider: { height: 1, marginLeft: 46 },
  dataCard: { borderRadius: 19, borderWidth: 1, padding: 14, marginBottom: 27 },
  readinessCard: { borderRadius: 19, borderWidth: 1, padding: 14, marginBottom: 27 },
  followUpCard: { borderRadius: 19, borderWidth: 1, padding: 14, marginBottom: 27 },
  outcomeHistoryCard: { borderRadius: 19, borderWidth: 1, padding: 14, marginBottom: 27 },
  retryAllButton: { alignSelf: "flex-start", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  retryAllText: { fontSize: 10, fontWeight: "800" },
  pendingSyncRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: "rgba(128,128,128,0.18)" },
  syncErrorText: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  clearLink: { alignSelf: "flex-start", paddingVertical: 6 },
  clearLinkText: { fontSize: 10, fontWeight: "800" },
  clearNoteInput: { minHeight: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, fontSize: 10, marginTop: 7 },
  clearActionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7 },
  clearConfirmButton: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  clearConfirmText: { fontSize: 9, fontWeight: "800" },
  clearCancelButton: { paddingHorizontal: 5, paddingVertical: 6 },
  dismissalHistory: { marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: "rgba(128,128,128,0.18)" },
  dismissalTitle: { fontSize: 10, fontWeight: "800", marginBottom: 5 },
  dismissalRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, minHeight: 38, marginTop: 7 },
  readinessHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  readinessItem: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 8, position: "relative" },
  followUpRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, position: "relative" },
  followUpMain: { flex: 1, minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9 },
  reviewButton: { paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderRadius: 8, marginLeft: 6 },
  reviewButtonText: { fontSize: 9, fontWeight: "800" },
  reviewHistory: { marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: "rgba(128,128,128,0.18)" },
  reviewHistoryTitle: { fontSize: 11, fontWeight: "800", marginBottom: 7 },
  reviewHistoryRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 24 },
  outcomeHistoryRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, minHeight: 38, marginTop: 9 },
  reviewNoteInput: { minHeight: 38, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 11, marginTop: 11 },
  reviewNoteText: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 6, marginTop: 12, marginBottom: 4 },
  filterChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  filterChipText: { fontSize: 9, fontWeight: "800" },
  readinessCheck: { width: 24, alignItems: "center" },
  readinessLink: { paddingHorizontal: 4, paddingVertical: 6 },
  readinessLinkText: { fontSize: 10, fontWeight: "800" },
  dataHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  dataIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  statusBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  dataNote: { fontSize: 11, lineHeight: 16, marginTop: 13 },
  rolloutTitle: { fontSize: 14, fontWeight: "800", marginTop: 15 },
  rolloutSubtitle: { fontSize: 11, marginTop: 3, marginBottom: 9 },
  taskRow: { minHeight: 31, flexDirection: "row", alignItems: "center", gap: 8 },
  taskLabel: { flex: 1, fontSize: 11 },
  taskState: { fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  connectorRow: { minHeight: 53, flexDirection: "row", alignItems: "center", gap: 9, position: "relative" },
  connectorDot: { width: 8, height: 8, borderRadius: 4 },
  connectorDivider: { position: "absolute", left: 17, right: 0, bottom: 0, height: 1 },
  footerText: { textAlign: "center", fontSize: 11, marginTop: 2 },
  pressed: { opacity: 0.65 },
});
