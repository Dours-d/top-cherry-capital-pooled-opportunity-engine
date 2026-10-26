import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
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
import { compareSnapshotToPrior, evaluateSnapshotReconciliation, getSnapshotFreshness, nextSnapshotFreshnessThreshold, type SnapshotFreshnessThreshold } from "@/shared/reconciliation-snapshots";
import { dismissalsFromOutcomeSyncAudits, dismissPendingOutcome, mergeOutcomeSyncAudits, queueOutcomeSyncAudit, resolveOutcomeSyncAudit, restoreDismissedOutcome as restoreDismissedOutcomeTransition, type OutcomeSyncAuditRecord, type OutcomeSyncDismissal, type PendingOutcomeRecord, type PendingOutcomeSyncAudit } from "@/shared/outcome-sync-queue";
import { CHARACTERISTIC_CHECK_AUDIT_QUEUE_STORAGE_KEY, enqueueCharacteristicCheck, normalizeCharacteristicCheckQueue, resolveCharacteristicCheck, type PendingCharacteristicCheck } from "@/shared/characteristic-check-audits";
import { filterProviderRetryResetsByGroup, getProviderRetryResetGroup, parsePendingProviderRetryResets, PROVIDER_RETRY_RESET_PENDING_KEY, type PendingProviderRetryReset } from "@/shared/provider-retry-resets";
import { buildEvidenceFilename, buildEvidencePackage, redactEvidencePackage, renderEvidencePackageMarkdown } from "@/shared/evidence-package";
import { buildEvidenceExportAudit } from "@/shared/export-audits";

const EBAY_READINESS_KEY = "topCherry.ebayReadiness";
const OBSERVATION_REVIEW_STORAGE_KEY = "topCherry.observationReviews";
const OUTCOME_SYNC_AUDIT_STORAGE_KEY = "topCherry.outcomeSyncAudits";
const OUTCOME_SYNC_AUDIT_QUEUE_STORAGE_KEY = "topCherry.outcomeSyncAuditQueue";
const SNAPSHOT_FRESHNESS_THRESHOLDS_STORAGE_KEY = "topCherry.snapshotFreshnessThresholds";
const PROVIDER_RETRY_RESET_LAST_EXPORT_KEY = "topCherry.providerRetryResetLastExport";
const PROVIDER_RETRY_RESET_EXPORT_PRIVACY_KEY = "topCherry.providerRetryResetExportPrivacy";
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
  const remoteOutcomeAudits = trpc.outcomeSyncAudits.list.useQuery(undefined, { enabled: isAuthenticated });
  const remoteSnapshots = trpc.reconciliationSnapshots.list.useQuery(undefined, { enabled: isAuthenticated });
  const remoteRetryResetAudits = trpc.reconciliationSnapshots.retryResetAudits.useQuery({ providerListingId: undefined }, { enabled: isAuthenticated });
  const syncReview = trpc.observationReviews.upsert.useMutation();
  const syncOutcome = trpc.listingOutcomes.upsert.useMutation();
  const syncOutcomeAudit = trpc.outcomeSyncAudits.upsert.useMutation();
  const reviewSnapshot = trpc.reconciliationSnapshots.review.useMutation();
  const checkSnapshotCharacteristics = trpc.reconciliationSnapshots.checkCharacteristics.useMutation();
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
  const [outcomeSyncAudits, setOutcomeSyncAudits] = useState<OutcomeSyncAuditRecord[]>([]);
  const [pendingOutcomeAuditRecords, setPendingOutcomeAuditRecords] = useState<PendingOutcomeSyncAudit[]>([]);
  const [pendingCharacteristicChecks, setPendingCharacteristicChecks] = useState<PendingCharacteristicCheck[]>([]);
  const [pendingProviderRetryResets, setPendingProviderRetryResets] = useState<PendingProviderRetryReset[]>([]);
  const [autoRetryAttempted, setAutoRetryAttempted] = useState(false);
  const [snapshotFreshnessThresholds, setSnapshotFreshnessThresholds] = useState<Record<string, SnapshotFreshnessThreshold>>({});

  const markSnapshotReviewed = async (snapshotId: string, reconciliationStatus: "reviewed" | "superseded", reviewNote: string) => {
    await reviewSnapshot.mutateAsync({ snapshotId, reconciliationStatus, reviewNote });
    await remoteSnapshots.refetch();
  };

  const markSnapshotsReviewed = async (snapshotIds: string[], reviewNote: string) => {
    for (const snapshotId of snapshotIds) {
      await reviewSnapshot.mutateAsync({ snapshotId, reconciliationStatus: "reviewed", reviewNote });
    }
    await remoteSnapshots.refetch();
  };

  const markSnapshotCharacteristicsChecked = async (snapshotId: string, note: string) => {
    const item = { snapshotId, auditId: `characteristics:${snapshotId}:${Date.now()}`, note: note.trim() };
    const queued = enqueueCharacteristicCheck(pendingCharacteristicChecks, item);
    setPendingCharacteristicChecks(queued);
    await AsyncStorage.setItem(CHARACTERISTIC_CHECK_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(queued));
    if (!isAuthenticated) return;
    try {
      await checkSnapshotCharacteristics.mutateAsync(item);
      const remaining = resolveCharacteristicCheck(queued, item.auditId, { ok: true }, new Date().toISOString());
      setPendingCharacteristicChecks(remaining);
      await AsyncStorage.setItem(CHARACTERISTIC_CHECK_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
      await remoteSnapshots.refetch();
    } catch (error) {
      const failed = resolveCharacteristicCheck(queued, item.auditId, { ok: false, error: error instanceof Error ? error.message : "The characteristic audit server rejected this write." }, new Date().toISOString());
      setPendingCharacteristicChecks(failed);
      await AsyncStorage.setItem(CHARACTERISTIC_CHECK_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(failed));
    }
  };

  const markSnapshotsCharacteristicsChecked = async (snapshotIds: string[], note: string) => {
    for (const snapshotId of snapshotIds) {
      await checkSnapshotCharacteristics.mutateAsync({ snapshotId, auditId: `characteristics:${snapshotId}:${Date.now()}`, note });
    }
    await remoteSnapshots.refetch();
  };

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
    void AsyncStorage.getItem(SNAPSHOT_FRESHNESS_THRESHOLDS_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try { setSnapshotFreshnessThresholds(JSON.parse(raw) as Record<string, SnapshotFreshnessThreshold>); } catch { setSnapshotFreshnessThresholds({}); }
    });
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(PROVIDER_RETRY_RESET_PENDING_KEY).then((raw) => {
      setPendingProviderRetryResets(parsePendingProviderRetryResets(raw));
    });
  }, []);

  const cycleSnapshotFreshnessThreshold = (marketplaceId: string) => {
    const next = nextSnapshotFreshnessThreshold(snapshotFreshnessThresholds[marketplaceId]);
    const updated = { ...snapshotFreshnessThresholds, [marketplaceId]: next };
    setSnapshotFreshnessThresholds(updated);
    void AsyncStorage.setItem(SNAPSHOT_FRESHNESS_THRESHOLDS_STORAGE_KEY, JSON.stringify(updated));
  };

  useEffect(() => {
    void Promise.all([AsyncStorage.getItem(OBSERVATION_SCHEDULE_STORAGE_KEY), AsyncStorage.getItem(OUTCOME_STORAGE_KEY), AsyncStorage.getItem(OBSERVATION_REVIEW_STORAGE_KEY), AsyncStorage.getItem(OUTCOME_SYNC_QUEUE_STORAGE_KEY), AsyncStorage.getItem(OUTCOME_SYNC_DISMISSAL_STORAGE_KEY), AsyncStorage.getItem(OUTCOME_SYNC_AUDIT_STORAGE_KEY), AsyncStorage.getItem(OUTCOME_SYNC_AUDIT_QUEUE_STORAGE_KEY), AsyncStorage.getItem(CHARACTERISTIC_CHECK_AUDIT_QUEUE_STORAGE_KEY)]).then(([scheduleRaw, outcomesRaw, reviewsRaw, pendingRaw, dismissalRaw, auditRaw, auditQueueRaw, characteristicQueueRaw]) => {
      try {
        const schedules = scheduleRaw ? JSON.parse(scheduleRaw) as Record<string, string | { nextObserveAt: string }> : {};
        setFollowUps(Object.entries(schedules).map(([listingId, value]) => typeof value === "string" ? { listingId, nextObserveAt: value } : { listingId, ...value }).filter((item) => item.nextObserveAt).sort((a, b) => new Date(a.nextObserveAt).getTime() - new Date(b.nextObserveAt).getTime()));
      } catch { setFollowUps([]); }
      try { setFollowUpOutcomes(outcomesRaw ? JSON.parse(outcomesRaw) as ListingOutcome[] : []); } catch { setFollowUpOutcomes([]); }
      try { const pending = pendingRaw ? JSON.parse(pendingRaw) as PendingOutcomeRecord[] : []; setPendingOutcomeRecords(pending.filter((item) => typeof item.id === "string" && typeof item.listingId === "string")); setPendingOutcomeSyncs(pending.length); } catch { setPendingOutcomeRecords([]); setPendingOutcomeSyncs(0); }
      try { const dismissals = dismissalRaw ? JSON.parse(dismissalRaw) as OutcomeSyncDismissal[] : []; setDismissedOutcomeRecords(dismissals.filter((item) => typeof item.outcomeId === "string" && typeof item.clearedAt === "string" && typeof item.note === "string").slice(0, 50)); } catch { setDismissedOutcomeRecords([]); }
      try { const audits = auditRaw ? JSON.parse(auditRaw) as OutcomeSyncAuditRecord[] : []; setOutcomeSyncAudits(audits.filter((item) => typeof item.auditId === "string" && typeof item.outcomeId === "string" && (item.action === "dismissed" || item.action === "restored") && typeof item.occurredAt === "string" && typeof item.note === "string").slice(0, 100)); } catch { setOutcomeSyncAudits([]); }
      try { const queue = auditQueueRaw ? JSON.parse(auditQueueRaw) as PendingOutcomeSyncAudit[] : []; setPendingOutcomeAuditRecords(queue.filter((item) => typeof item.auditId === "string" && typeof item.outcomeId === "string" && (item.action === "dismissed" || item.action === "restored") && typeof item.occurredAt === "string" && typeof item.note === "string").slice(0, 100)); } catch { setPendingOutcomeAuditRecords([]); }
      try { setPendingCharacteristicChecks(normalizeCharacteristicCheckQueue(characteristicQueueRaw ? JSON.parse(characteristicQueueRaw) : [])); } catch { setPendingCharacteristicChecks([]); }
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

  useEffect(() => {
    if (!isAuthenticated || !remoteOutcomeAudits.data?.length) return;
    const remote = remoteOutcomeAudits.data.map((audit) => ({ auditId: audit.auditId, outcomeId: audit.outcomeId, action: audit.action, occurredAt: new Date(audit.occurredAt).toISOString(), note: audit.note })) as OutcomeSyncAuditRecord[];
    const merged = mergeOutcomeSyncAudits(outcomeSyncAudits, remote);
    const remoteIds = new Set(remote.map((audit) => audit.auditId));
    const remainingPending = pendingOutcomeAuditRecords.filter((audit) => !remoteIds.has(audit.auditId));
    if (remainingPending.length !== pendingOutcomeAuditRecords.length) {
      setPendingOutcomeAuditRecords(remainingPending);
      void AsyncStorage.setItem(OUTCOME_SYNC_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(remainingPending));
    }
    if (JSON.stringify(merged) !== JSON.stringify(outcomeSyncAudits)) {
      setOutcomeSyncAudits(merged);
      setDismissedOutcomeRecords(dismissalsFromOutcomeSyncAudits(merged, dismissedOutcomeRecords));
      void AsyncStorage.setItem(OUTCOME_SYNC_AUDIT_STORAGE_KEY, JSON.stringify(merged));
      void AsyncStorage.setItem(OUTCOME_SYNC_DISMISSAL_STORAGE_KEY, JSON.stringify(dismissalsFromOutcomeSyncAudits(merged, dismissedOutcomeRecords)));
    }
  }, [isAuthenticated, remoteOutcomeAudits.data, outcomeSyncAudits, dismissedOutcomeRecords, pendingOutcomeAuditRecords]);

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

  const recordOutcomeSyncAudit = async (audit: OutcomeSyncAuditRecord) => {
    const merged = mergeOutcomeSyncAudits(outcomeSyncAudits, [audit]);
    setOutcomeSyncAudits(merged);
    await AsyncStorage.setItem(OUTCOME_SYNC_AUDIT_STORAGE_KEY, JSON.stringify(merged));
    const attemptedAt = new Date().toISOString();
    const nextQueue = queueOutcomeSyncAudit(pendingOutcomeAuditRecords, audit, attemptedAt);
    setPendingOutcomeAuditRecords(nextQueue);
    await AsyncStorage.setItem(OUTCOME_SYNC_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
    if (!isAuthenticated) return;
    try {
      await syncOutcomeAudit.mutateAsync(audit);
      const remaining = resolveOutcomeSyncAudit(nextQueue, audit.auditId, { ok: true }, new Date().toISOString());
      setPendingOutcomeAuditRecords(remaining);
      await AsyncStorage.setItem(OUTCOME_SYNC_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
    } catch (error) {
      const syncError = error instanceof Error ? error.message : "The audit server rejected this sync attempt.";
      const failed = resolveOutcomeSyncAudit(nextQueue, audit.auditId, { ok: false, error: syncError }, new Date().toISOString());
      setPendingOutcomeAuditRecords(failed);
      await AsyncStorage.setItem(OUTCOME_SYNC_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(failed));
    }
  };

  const retryPendingOutcomeAuditSync = async () => {
    if (!isAuthenticated || !pendingOutcomeAuditRecords.length) return;
    const remaining: PendingOutcomeSyncAudit[] = [];
    for (const audit of pendingOutcomeAuditRecords) {
      try {
        const { syncError: _syncError, lastAttemptAt: _lastAttemptAt, ...payload } = audit;
        await syncOutcomeAudit.mutateAsync(payload);
      } catch (error) {
        const failed = resolveOutcomeSyncAudit([audit], audit.auditId, { ok: false, error: error instanceof Error ? error.message : "The audit server rejected this sync attempt." }, new Date().toISOString());
        remaining.push(...failed);
      }
    }
    setPendingOutcomeAuditRecords(remaining);
    await AsyncStorage.setItem(OUTCOME_SYNC_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
  };

  const clearPendingOutcome = async (outcomeId: string, note: string) => {
    const clearedAt = new Date().toISOString();
    const result = dismissPendingOutcome(pendingOutcomeRecords, dismissedOutcomeRecords, outcomeId, note, clearedAt);
    if (!result) return;
    setDismissedOutcomeRecords(result.dismissals);
    setPendingOutcomeRecords(result.pending);
    setPendingOutcomeSyncs(result.pending.length);
    await AsyncStorage.setItem(OUTCOME_SYNC_QUEUE_STORAGE_KEY, JSON.stringify(result.pending));
    await AsyncStorage.setItem(OUTCOME_SYNC_DISMISSAL_STORAGE_KEY, JSON.stringify(result.dismissals));
    await recordOutcomeSyncAudit({ auditId: `dismissed:${outcomeId}:${clearedAt}`, outcomeId, action: "dismissed", occurredAt: clearedAt, note: note.trim() });
  };

  const restoreDismissedOutcome = async (outcomeId: string, note: string) => {
    const restoredAt = new Date().toISOString();
    const result = restoreDismissedOutcomeTransition(pendingOutcomeRecords, dismissedOutcomeRecords, followUpOutcomes, outcomeId, note, restoredAt);
    if (!result) return;
    setPendingOutcomeRecords(result.pending);
    setPendingOutcomeSyncs(result.pending.length);
    setDismissedOutcomeRecords(result.dismissals);
    await AsyncStorage.setItem(OUTCOME_SYNC_QUEUE_STORAGE_KEY, JSON.stringify(result.pending));
    await AsyncStorage.setItem(OUTCOME_SYNC_DISMISSAL_STORAGE_KEY, JSON.stringify(result.dismissals));
    await recordOutcomeSyncAudit({ auditId: `restored:${outcomeId}:${restoredAt}`, outcomeId, action: "restored", occurredAt: restoredAt, note: note.trim() });
  };

  const retryPendingCharacteristicChecks = async () => {
    if (!isAuthenticated || !pendingCharacteristicChecks.length) return;
    let remaining = [...pendingCharacteristicChecks];
    for (const item of pendingCharacteristicChecks) {
      try {
        await checkSnapshotCharacteristics.mutateAsync({ snapshotId: item.snapshotId, auditId: item.auditId, note: item.note });
        remaining = resolveCharacteristicCheck(remaining, item.auditId, { ok: true }, new Date().toISOString());
      } catch (error) {
        remaining = resolveCharacteristicCheck(remaining, item.auditId, { ok: false, error: error instanceof Error ? error.message : "The characteristic audit server rejected this retry." }, new Date().toISOString());
      }
      setPendingCharacteristicChecks(remaining);
      await AsyncStorage.setItem(CHARACTERISTIC_CHECK_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
    }
    await remoteSnapshots.refetch();
  };

  useEffect(() => {
    if (!isAuthenticated || autoRetryAttempted || (!pendingOutcomeRecords.length && !pendingOutcomeAuditRecords.length && !pendingCharacteristicChecks.length)) return;
    setAutoRetryAttempted(true);
    void Promise.all([retryPendingOutcomeSync(), retryPendingOutcomeAuditSync(), retryPendingCharacteristicChecks()]);
  }, [isAuthenticated, pendingOutcomeRecords.length, pendingOutcomeAuditRecords.length, pendingCharacteristicChecks.length, autoRetryAttempted]);

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
        <ReconciliationSnapshotQueue colors={colors} authenticated={isAuthenticated} snapshots={remoteSnapshots.data ?? []} reviewing={reviewSnapshot.isPending} checkingCharacteristics={checkSnapshotCharacteristics.isPending} pendingCharacteristicChecks={pendingCharacteristicChecks} freshnessThresholds={snapshotFreshnessThresholds} onCycleFreshnessThreshold={cycleSnapshotFreshnessThreshold} onRetryCharacteristicChecks={() => void retryPendingCharacteristicChecks()} onReview={(snapshotId, status, note) => void markSnapshotReviewed(snapshotId, status, note)} onReviewMany={(snapshotIds, note) => markSnapshotsReviewed(snapshotIds, note)} onCheckCharacteristics={(snapshotId, note) => markSnapshotCharacteristicsChecked(snapshotId, note)} onCheckCharacteristicsMany={(snapshotIds, note) => markSnapshotsCharacteristicsChecked(snapshotIds, note)} />
        <ProviderRetryResetSummary colors={colors} authenticated={isAuthenticated} audits={remoteRetryResetAudits.data ?? []} pending={pendingProviderRetryResets} listingContext={(remoteSnapshots.data ?? []) as WorkspaceSnapshot[]} onOpenListing={(providerListingId) => { const context = (remoteSnapshots.data ?? []).find((snapshot) => snapshot.providerListingId === providerListingId) as WorkspaceSnapshot | undefined; router.push({ pathname: "/snapshot-history", params: { providerListingId, title: context?.title ?? providerListingId, profileSlug: context?.profileSlug ?? "" } }); }} />
        <SyncedOutcomeHistory colors={colors} outcomes={followUpOutcomes} authenticated={isAuthenticated} auditCount={outcomeSyncAudits.length} pendingAuditSyncs={pendingOutcomeAuditRecords.length} pendingSyncs={pendingOutcomeSyncs} pendingRecords={pendingOutcomeRecords} dismissedRecords={dismissedOutcomeRecords} onRetryPending={() => void retryPendingOutcomeSync()} onRetryAudit={() => void retryPendingOutcomeAuditSync()} onClearPending={(outcomeId, note) => void clearPendingOutcome(outcomeId, note)} onRestorePending={(outcomeId, note) => void restoreDismissedOutcome(outcomeId, note)} retrying={syncOutcome.isPending} retryingAudit={syncOutcomeAudit.isPending} />
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

type WorkspaceSnapshot = {
  snapshotId: string;
  marketplaceId: string;
  query: string;
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

function ReconciliationSnapshotQueue({ colors, authenticated, snapshots, reviewing, checkingCharacteristics, pendingCharacteristicChecks, freshnessThresholds, onCycleFreshnessThreshold, onRetryCharacteristicChecks, onReview, onReviewMany, onCheckCharacteristics, onCheckCharacteristicsMany }: { colors: ReturnType<typeof useColors>; authenticated: boolean; snapshots: WorkspaceSnapshot[]; reviewing: boolean; checkingCharacteristics: boolean; pendingCharacteristicChecks: PendingCharacteristicCheck[]; freshnessThresholds: Record<string, SnapshotFreshnessThreshold>; onCycleFreshnessThreshold: (marketplaceId: string) => void; onRetryCharacteristicChecks: () => void; onReview: (snapshotId: string, status: "reviewed" | "superseded", note: string) => void; onReviewMany: (snapshotIds: string[], note: string) => Promise<void>; onCheckCharacteristics: (snapshotId: string, note: string) => Promise<void>; onCheckCharacteristicsMany: (snapshotIds: string[], note: string) => Promise<void> }) {
  const [filter, setFilter] = useState<"observed" | "reviewed" | "superseded">("observed");
  const [reviewNote, setReviewNote] = useState("");
  const counts = { observed: snapshots.filter((item) => item.reconciliationStatus === "observed").length, reviewed: snapshots.filter((item) => item.reconciliationStatus === "reviewed").length, superseded: snapshots.filter((item) => item.reconciliationStatus === "superseded").length };
  const visible = snapshots.filter((item) => item.reconciliationStatus === filter).slice(0, 8);
  return <View style={[styles.snapshotQueueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.readinessHeader}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Persisted source observations</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{authenticated ? `${counts.observed} awaiting review · ${snapshots.length} stored` : "Sign in to review persisted provider observations"}</Text></View><View style={[styles.statusBadge, { backgroundColor: counts.observed ? colors.warning : colors.background }]}><Text style={[styles.statusBadgeText, { color: counts.observed ? colors.foreground : colors.muted }]}>{counts.observed ? "REVIEW" : "CLEAR"}</Text></View></View>
    <Text style={[styles.dataNote, { color: colors.muted }]}>Reviewing confirms only how this provider observation should be retained. A separate characteristic check records that the profile prompts were inspected. Neither action establishes stock, fair value, demand, a sale, or allocation eligibility. A note is required for every action. Freshness settings only change the age prompt.</Text>
    {pendingCharacteristicChecks.length ? <View style={[styles.pendingSyncCard, { backgroundColor: colors.background, borderColor: colors.warning }]}><Text style={[styles.pendingSyncTitle, { color: colors.warning }]}>{pendingCharacteristicChecks.length} characteristic audit{pendingCharacteristicChecks.length === 1 ? "" : "s"} pending synchronization</Text><Text style={[styles.pendingSyncText, { color: colors.muted }]}>{pendingCharacteristicChecks[0]?.syncError ?? "The local audit is retained until the authenticated server confirms it."}</Text><Pressable onPress={onRetryCharacteristicChecks} disabled={checkingCharacteristics} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.warning }, checkingCharacteristics && styles.disabled, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.warning }]}>{checkingCharacteristics ? "Retrying…" : "Retry characteristic audits"}</Text></Pressable></View> : null}
    <View style={styles.filterRow}>{(["observed", "reviewed", "superseded"] as const).map((option) => <Pressable key={option} onPress={() => setFilter(option)} style={({ pressed }) => [styles.filterChip, { backgroundColor: filter === option ? colors.foreground : colors.background, borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.filterChipText, { color: filter === option ? colors.background : colors.muted }]}>{option === "observed" ? `Observed (${counts.observed})` : option === "reviewed" ? `Reviewed (${counts.reviewed})` : `Superseded (${counts.superseded})`}</Text></Pressable>)}</View>
    {!authenticated ? <Text style={[styles.dataNote, { color: colors.muted }]}>The current device has no account session, so no remote snapshot records are shown.</Text> : !visible.length ? <Text style={[styles.dataNote, { color: colors.muted }]}>No {filter} snapshots.</Text> : <>
      <TextInput value={reviewNote} onChangeText={setReviewNote} placeholder="Required review or characteristic-check note" placeholderTextColor={colors.muted} style={[styles.reviewNoteInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
      {filter === "observed" && visible.length > 1 ? <Pressable disabled={reviewing || !reviewNote.trim()} onPress={async () => { await onReviewMany(visible.map((snapshot) => snapshot.snapshotId), reviewNote.trim()); setReviewNote(""); }} style={({ pressed }) => [styles.bulkReviewButton, { backgroundColor: colors.primary }, (reviewing || !reviewNote.trim()) && styles.disabled, pressed && styles.pressed]}><Text style={[styles.bulkReviewButtonText, { color: colors.onPrimary }]}>{reviewing ? "Reviewing visible…" : `Review visible (${visible.length})`}</Text></Pressable> : null}
      {filter === "observed" && visible.some((snapshot) => !snapshot.characteristicsChecked) && visible.length > 1 ? <Pressable disabled={checkingCharacteristics || !reviewNote.trim()} onPress={async () => { await onCheckCharacteristicsMany(visible.filter((snapshot) => !snapshot.characteristicsChecked).map((snapshot) => snapshot.snapshotId), reviewNote.trim()); setReviewNote(""); }} style={({ pressed }) => [styles.bulkReviewButton, { backgroundColor: colors.background, borderColor: colors.primary, borderWidth: 1 }, (checkingCharacteristics || !reviewNote.trim()) && styles.disabled, pressed && styles.pressed]}><Text style={[styles.bulkReviewButtonText, { color: colors.primary }]}>{checkingCharacteristics ? "Checking visible…" : `Check characteristics (${visible.filter((snapshot) => !snapshot.characteristicsChecked).length})`}</Text></Pressable> : null}
      {visible.map((snapshot) => { const comparison = compareSnapshotToPrior(snapshot, snapshots); const reconciliation = evaluateSnapshotReconciliation(snapshot); const threshold = freshnessThresholds[snapshot.marketplaceId]; const freshness = getSnapshotFreshness(snapshot.sourceFetchedAt, new Date(), threshold); return <View key={snapshot.snapshotId} style={[styles.snapshotRow, { borderTopColor: colors.border }]}>
        <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]} numberOfLines={2}>{snapshot.title}</Text><Text style={[styles.settingDescription, { color: colors.muted }]} numberOfLines={1}>{snapshot.marketplaceId} · {formatCurrency(snapshot.askingPrice, snapshot.currency ?? undefined)} · {snapshot.condition}</Text><Text style={[styles.settingDescription, { color: colors.muted }]} numberOfLines={1}>{new Date(snapshot.sourceFetchedAt).toLocaleString()} · {snapshot.providerListingId}</Text><Text style={[styles.snapshotFreshness, { color: freshness.state === "stale" ? colors.warning : freshness.state === "fresh" ? colors.success : colors.muted }]}>{freshness.state === "unknown" ? "Observation age unknown" : freshness.state === "fresh" ? "Fresh observation" : freshness.state === "aging" ? "Aging observation" : "Stale observation"} · quality prompt only</Text><Text style={[styles.snapshotQuality, { color: reconciliation.state === "ready" ? colors.success : colors.warning }]}>{reconciliation.state === "ready" ? "Provider fields ready" : `Provider fields need attention: ${reconciliation.requiredMissing.join(", ")}`}{reconciliation.recommendedMissing.length ? ` · recommended missing: ${reconciliation.recommendedMissing.join(", ")}` : ""}</Text><Text style={[styles.snapshotMovement, { color: comparison.state === "increased" ? colors.warning : comparison.state === "decreased" ? colors.success : colors.muted }]}>{comparison.state === "unknown" ? "No currency-matched prior observation" : comparison.state === "unchanged" ? "Asking price unchanged" : `${comparison.state === "increased" ? "Asking price increased" : "Asking price decreased"} by ${formatCurrency(Math.abs(comparison.delta ?? 0), comparison.currency)}`}. This is not a sale signal.</Text><Text style={[styles.snapshotQuality, { color: snapshot.characteristicsChecked ? colors.success : colors.warning }]}>{snapshot.characteristicsChecked ? `Characteristics checked${snapshot.characteristicsCheckedAt ? ` · ${new Date(snapshot.characteristicsCheckedAt).toLocaleString()}` : ""}` : "Characteristics not checked"} · profile prompts only</Text>{snapshot.characteristicsCheckNote ? <Text style={[styles.reviewNoteText, { color: colors.foreground }]} numberOfLines={2}>“{snapshot.characteristicsCheckNote}”</Text> : null}{snapshot.reviewNote ? <Text style={[styles.reviewNoteText, { color: colors.foreground }]} numberOfLines={2}>“{snapshot.reviewNote}”</Text> : null}</View>
        <View style={styles.snapshotActions}><Pressable onPress={() => router.push({ pathname: "/snapshot-history", params: { providerListingId: snapshot.providerListingId, title: snapshot.title, profileSlug: snapshot.profileSlug } })} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.primary }]}>History</Text></Pressable><Pressable onPress={() => onCycleFreshnessThreshold(snapshot.marketplaceId)} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>{threshold ? `${threshold.freshHours}h / ${threshold.agingHours}h` : "24h / 7d"}</Text></Pressable>{!snapshot.characteristicsChecked ? <Pressable disabled={checkingCharacteristics || !reviewNote.trim()} onPress={() => { onCheckCharacteristics(snapshot.snapshotId, reviewNote.trim()); setReviewNote(""); }} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.primary }, (checkingCharacteristics || !reviewNote.trim()) && styles.disabled, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.primary }]}>{checkingCharacteristics ? "Checking…" : "Check characteristics"}</Text></Pressable> : null}{filter === "observed" ? <><Pressable disabled={reviewing || !reviewNote.trim()} onPress={() => { onReview(snapshot.snapshotId, "reviewed", reviewNote.trim()); setReviewNote(""); }} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.border }, (reviewing || !reviewNote.trim()) && styles.disabled, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>Review</Text></Pressable><Pressable disabled={reviewing || !reviewNote.trim()} onPress={() => { onReview(snapshot.snapshotId, "superseded", reviewNote.trim()); setReviewNote(""); }} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.warning }, (reviewing || !reviewNote.trim()) && styles.disabled, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.warning }]}>Supersede</Text></Pressable></> : null}</View>
      </View>; })}
    </>}
  </View>;
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

function ProviderRetryResetSummary({ colors, authenticated, audits, pending, listingContext, onOpenListing }: { colors: ReturnType<typeof useColors>; authenticated: boolean; audits: { resetId: string; providerListingId: string; previousAttemptCount: number; note: string; occurredAt: Date | string }[]; pending: PendingProviderRetryReset[]; listingContext: WorkspaceSnapshot[]; onOpenListing: (providerListingId: string) => void }) {
  const exportAuditHistory = trpc.evidenceExportAudits.list.useQuery(undefined, { enabled: authenticated });
  const appendExportAudit = trpc.evidenceExportAudits.append.useMutation();
  const [failureFilter, setFailureFilter] = useState<"all" | "repeated">("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const repeatedAudits = audits.filter((audit) => audit.previousAttemptCount >= 2);
  const repeatedPending = pending.filter((item) => item.previousAttemptCount >= 2);
  const groupedCounts = [...audits.map((audit) => audit.providerListingId), ...pending.map((item) => item.providerListingId)].reduce<Record<string, number>>((groups, providerListingId) => {
    const group = getProviderRetryResetGroup(providerListingId, listingContext);
    groups[group] = (groups[group] ?? 0) + 1;
    return groups;
  }, {});
  const groupOptions = ["all", ...Object.keys(groupedCounts).sort()];
  const filteredAudits = filterProviderRetryResetsByGroup(audits, groupFilter, listingContext);
  const filteredPending = filterProviderRetryResetsByGroup(pending, groupFilter, listingContext);
  const filteredRepeatedAudits = filterProviderRetryResetsByGroup(repeatedAudits, groupFilter, listingContext);
  const filteredRepeatedPending = filterProviderRetryResetsByGroup(repeatedPending, groupFilter, listingContext);
  const visibleAudits = (failureFilter === "repeated" ? filteredRepeatedAudits : filteredAudits).slice().sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 5);
  const visiblePending = failureFilter === "repeated" ? filteredRepeatedPending : filteredPending;
  const groupChipCounts = [...(failureFilter === "repeated" ? repeatedAudits : audits), ...(failureFilter === "repeated" ? repeatedPending : pending)].reduce<Record<string, number>>((counts, item) => {
    const group = getProviderRetryResetGroup(item.providerListingId, listingContext);
    counts[group] = (counts[group] ?? 0) + 1;
    return counts;
  }, {});
  const groupedCountLabel = Object.entries(groupedCounts).sort(([, a], [, b]) => b - a).slice(0, 4).map(([group, count]) => `${group}: ${count}`).join(" · ");
  const [exportPreview, setExportPreview] = useState<{ format: "json" | "markdown"; content: string; redactedContent: string; titlePreservingRedactedContent: string; contextPreservingRedactedContent: string; titleAndContextPreservingRedactedContent: string; redacted: boolean; keepTitles: boolean; keepContext: boolean; filename: string; count: number; scopeLabel: string } | null>(null);
  const [copiedExport, setCopiedExport] = useState<{ format: "json" | "markdown"; occurredAt: string } | null>(null);
  const [lastExport, setLastExport] = useState<{ format: "json" | "markdown"; occurredAt: string; scopeLabel: string; count: number } | null>(null);
  const [exportAuditSyncError, setExportAuditSyncError] = useState<string | null>(null);
  const [exportPrivacyPreferences, setExportPrivacyPreferences] = useState({ keepTitles: false, keepContext: false });
  useEffect(() => {
    void AsyncStorage.getItem(PROVIDER_RETRY_RESET_LAST_EXPORT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== "object") return;
        const candidate = value as Partial<NonNullable<typeof lastExport>>;
        if ((candidate.format === "json" || candidate.format === "markdown") && typeof candidate.occurredAt === "string" && typeof candidate.scopeLabel === "string" && typeof candidate.count === "number" && Number.isInteger(candidate.count)) {
          setLastExport({ format: candidate.format, occurredAt: candidate.occurredAt, scopeLabel: candidate.scopeLabel, count: candidate.count });
        }
      } catch {
        // Ignore malformed local metadata; audit records remain unaffected.
      }
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    void AsyncStorage.getItem(PROVIDER_RETRY_RESET_EXPORT_PRIVACY_KEY).then((raw) => {
      if (!raw) return;
      try {
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== "object") return;
        const candidate = value as Partial<typeof exportPrivacyPreferences>;
        setExportPrivacyPreferences({ keepTitles: candidate.keepTitles === true, keepContext: candidate.keepContext === true });
      } catch {
        // Ignore malformed local privacy preferences; every new export remains redacted by default.
      }
    }).catch(() => undefined);
  }, []);
  const exportRepeated = async (format: "json" | "markdown") => {
    const exportAudits = [...filteredRepeatedAudits.map((audit) => ({ resetId: audit.resetId, providerListingId: audit.providerListingId, previousAttemptCount: audit.previousAttemptCount, occurredAt: audit.occurredAt, note: audit.note, syncStatus: "account-synced" as const })), ...filteredRepeatedPending.map((item) => ({ resetId: item.resetId, providerListingId: item.providerListingId, previousAttemptCount: item.previousAttemptCount, occurredAt: item.occurredAt, note: item.note, syncStatus: "pending-local" as const }))];
    const sourceQuality = { observationCount: 0, ageCounts: { fresh: 0, aging: 0, stale: 0, unknown: 0 }, missingCounts: {} };
    const pkg = buildEvidencePackage({ exportedAt: new Date().toISOString(), scope: { title: "Workspace repeated provider-read retry resets", profileSlug: null }, sourceQuality, snapshots: [], characteristicAudits: [], retryResetAudits: exportAudits });
    const redactedPkg = redactEvidencePackage(pkg);
    const titlePreservingRedactedPkg = redactEvidencePackage(pkg, { redactTitles: false });
    const contextPreservingRedactedPkg = redactEvidencePackage(pkg, { redactContext: false });
    const titleAndContextPreservingRedactedPkg = redactEvidencePackage(pkg, { redactTitles: false, redactContext: false });
    const content = format === "json" ? JSON.stringify(pkg, null, 2) : renderEvidencePackageMarkdown(pkg);
    const redactedContent = format === "json" ? JSON.stringify(redactedPkg, null, 2) : renderEvidencePackageMarkdown(redactedPkg);
    const titlePreservingRedactedContent = format === "json" ? JSON.stringify(titlePreservingRedactedPkg, null, 2) : renderEvidencePackageMarkdown(titlePreservingRedactedPkg);
    const contextPreservingRedactedContent = format === "json" ? JSON.stringify(contextPreservingRedactedPkg, null, 2) : renderEvidencePackageMarkdown(contextPreservingRedactedPkg);
    const titleAndContextPreservingRedactedContent = format === "json" ? JSON.stringify(titleAndContextPreservingRedactedPkg, null, 2) : renderEvidencePackageMarkdown(titleAndContextPreservingRedactedPkg);
    const scopeLabel = `${failureFilter === "repeated" ? "Repeated failures" : "All resets"} · ${groupFilter === "all" ? "All groups" : groupFilter}`;
    setCopiedExport(null);
    setExportPreview({ format, content, redactedContent, titlePreservingRedactedContent, contextPreservingRedactedContent, titleAndContextPreservingRedactedContent, redacted: true, keepTitles: exportPrivacyPreferences.keepTitles, keepContext: exportPrivacyPreferences.keepContext, filename: buildEvidenceFilename("workspace-repeated-provider-retry-resets", format), count: exportAudits.length, scopeLabel });
  };
  const toggleExportRedaction = () => setExportPreview((current) => current ? { ...current, redacted: !current.redacted } : current);
  const applyPrivacyPreferences = (preferences: { keepTitles: boolean; keepContext: boolean }) => {
    setExportPrivacyPreferences(preferences);
    void AsyncStorage.setItem(PROVIDER_RETRY_RESET_EXPORT_PRIVACY_KEY, JSON.stringify(preferences)).catch(() => undefined);
    setExportPreview((current) => current ? { ...current, ...preferences } : current);
  };
  const toggleExportTitles = () => applyPrivacyPreferences({ keepTitles: !exportPrivacyPreferences.keepTitles, keepContext: exportPrivacyPreferences.keepContext });
  const toggleExportContext = () => applyPrivacyPreferences({ keepTitles: exportPrivacyPreferences.keepTitles, keepContext: !exportPrivacyPreferences.keepContext });
  const resetExportPrivacyPreferences = () => {
    Alert.alert("Reset export privacy choices?", "New exports will redact identifiers, titles, marketplace/profile context and operator notes unless you choose otherwise in the preview.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset choices", style: "destructive", onPress: () => { applyPrivacyPreferences({ keepTitles: false, keepContext: false }); void AsyncStorage.removeItem(PROVIDER_RETRY_RESET_EXPORT_PRIVACY_KEY).catch(() => undefined); } },
    ]);
  };
  const getVisibleExportContent = () => {
    if (!exportPreview) return "";
    if (!exportPreview.redacted) return exportPreview.content;
    if (exportPreview.keepTitles && exportPreview.keepContext) return exportPreview.titleAndContextPreservingRedactedContent;
    if (exportPreview.keepTitles) return exportPreview.titlePreservingRedactedContent;
    if (exportPreview.keepContext) return exportPreview.contextPreservingRedactedContent;
    return exportPreview.redactedContent;
  };
  const recordExportAudit = (action: "copied" | "shared") => {
    if (!authenticated || !exportPreview) return;
    const occurredAt = new Date().toISOString();
    const audit = buildEvidenceExportAudit({ action, format: exportPreview.format, privacyMode: exportPreview.redacted ? "redacted" : "full", keepTitles: exportPreview.redacted && exportPreview.keepTitles, keepContext: exportPreview.redacted && exportPreview.keepContext, scopeLabel: exportPreview.scopeLabel, eventCount: exportPreview.count, occurredAt });
    void appendExportAudit.mutateAsync(audit).then(() => {
      setExportAuditSyncError(null);
      return exportAuditHistory.refetch();
    }).catch(() => setExportAuditSyncError("The export action is retained locally, but the account audit ledger could not be updated."));
  };
  const shareExport = async () => {
    if (!exportPreview) return;
    try {
      await Share.share({ title: exportPreview.filename, message: getVisibleExportContent() });
      const completedExport = { format: exportPreview.format, occurredAt: new Date().toISOString(), scopeLabel: exportPreview.scopeLabel, count: exportPreview.count };
      setLastExport(completedExport);
      recordExportAudit("shared");
      void AsyncStorage.setItem(PROVIDER_RETRY_RESET_LAST_EXPORT_KEY, JSON.stringify(completedExport)).catch(() => undefined);
      setExportPreview(null);
    } catch {
      Alert.alert("Export unavailable", "Sharing is unavailable on this device; the local and account audit records remain unchanged.");
    }
  };
  const clearLastExport = () => {
    Alert.alert("Clear export history?", "This removes only the local last-export summary. Audit records, pending synchronization queues, and shared files are unchanged.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear summary",
        style: "destructive",
        onPress: () => {
          void AsyncStorage.removeItem(PROVIDER_RETRY_RESET_LAST_EXPORT_KEY).then(() => setLastExport(null)).catch(() => Alert.alert("Unable to clear", "The local export summary could not be removed."));
        },
      },
    ]);
  };
  const copyExport = async () => {
    if (!exportPreview) return;
    try {
      await Clipboard.setStringAsync(getVisibleExportContent());
      const copiedAt = new Date().toISOString();
      setCopiedExport({ format: exportPreview.format, occurredAt: copiedAt });
      recordExportAudit("copied");
      Alert.alert("Copied", `${exportPreview.format.toUpperCase()} evidence package copied to the clipboard.`);
    } catch {
      Alert.alert("Copy unavailable", "The evidence package could not be copied; the local and account audit records remain unchanged.");
    }
  };
  return <>
  <View style={[styles.retryResetSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.readinessHeader}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Provider-read retry audit</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{authenticated ? `${audits.length} account-synced reset${audits.length === 1 ? "" : "s"}` : "Account audit unavailable until sign-in"}{pending.length ? ` · ${pending.length} queued locally` : ""}</Text></View><MaterialIcons name="history" size={20} color={pending.length ? colors.warning : colors.primary} /></View>
    <Text style={[styles.dataNote, { color: colors.muted }]}>A reset records why a bounded provider-read retry budget was reopened. It does not confirm provider recovery, listing availability, a sale, a stock unit, a valuation, or an allocation decision.</Text>
    <View style={styles.filterRow}>{(["all", "repeated"] as const).map((option) => <Pressable key={option} onPress={() => setFailureFilter(option)} style={({ pressed }) => [styles.filterChip, { backgroundColor: failureFilter === option ? colors.foreground : colors.background, borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.filterChipText, { color: failureFilter === option ? colors.background : colors.muted }]}>{option === "all" ? `All (${filteredAudits.length + filteredPending.length})` : `Repeated · 2+ attempts (${filteredRepeatedAudits.length + filteredRepeatedPending.length})`}</Text></Pressable>)}</View>
    <View style={styles.filterRow}>{groupOptions.slice(0, 5).map((option) => <Pressable key={option} onPress={() => setGroupFilter(option)} style={({ pressed }) => [styles.filterChip, { backgroundColor: groupFilter === option ? colors.primary : colors.background, borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.filterChipText, { color: groupFilter === option ? colors.onPrimary : colors.muted }]}>{option === "all" ? `All groups (${failureFilter === "repeated" ? filteredRepeatedAudits.length + filteredRepeatedPending.length : filteredAudits.length + filteredPending.length})` : `${option} (${groupChipCounts[option] ?? 0})`}</Text></Pressable>)}</View>
    <Text style={[styles.dataNote, { color: colors.muted }]}>{failureFilter === "repeated" ? "Showing only reset events where at least two provider-read attempts preceded the reset." : "Showing all reset events."} {groupFilter === "all" ? "All marketplace/profile groups are included." : `Showing ${groupFilter}.`} Actual provider-read failures are not retained as a complete historical series unless a retry budget was reset.</Text>
    {groupedCountLabel ? <Text style={[styles.dataNote, { color: colors.muted }]}>Context counts · {groupedCountLabel}. These are retry-reset events, not failure rates or marketplace availability estimates.</Text> : null}
    <View style={[styles.exportPrivacyPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.readinessHeader}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Evidence export privacy</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>Identifiers and operator notes remain redacted unless explicitly revealed in an export preview.</Text></View><MaterialIcons name="privacy-tip" size={19} color={colors.primary} /></View>
      <View style={styles.exportPrivacyRow}><View style={styles.settingCopy}><Text style={[styles.settingDescription, { color: colors.foreground }]}>Keep listing titles</Text><Text style={[styles.dataNote, { color: colors.muted }]}>Titles can help recognize the research subject.</Text></View><Switch value={exportPrivacyPreferences.keepTitles} onValueChange={toggleExportTitles} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={exportPrivacyPreferences.keepTitles ? colors.onPrimary : colors.muted} /></View>
      <View style={styles.exportPrivacyRow}><View style={styles.settingCopy}><Text style={[styles.settingDescription, { color: colors.foreground }]}>Keep marketplace/profile context</Text><Text style={[styles.dataNote, { color: colors.muted }]}>Context can reveal the market lens used.</Text></View><Switch value={exportPrivacyPreferences.keepContext} onValueChange={toggleExportContext} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={exportPrivacyPreferences.keepContext ? colors.onPrimary : colors.muted} /></View>
      <Text style={[styles.dataNote, { color: colors.muted }]}>Listing IDs, snapshot IDs, item IDs, seller identifiers and operator notes are always redacted in privacy mode. This preference changes export content only; it does not alter stored audits or observations.</Text>
      {(exportPrivacyPreferences.keepTitles || exportPrivacyPreferences.keepContext) ? <Pressable onPress={resetExportPrivacyPreferences} accessibilityRole="button" accessibilityLabel="Reset export privacy choices" style={({ pressed }) => [styles.reviewButton, { borderColor: colors.warning, alignSelf: "flex-start" }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.warning }]}>Reset privacy choices</Text></Pressable> : null}
    </View>
    {failureFilter === "repeated" && (filteredRepeatedAudits.length || filteredRepeatedPending.length) ? <View style={styles.retryResetExportRow}><Pressable onPress={() => void exportRepeated("json")} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.primary }]}>Export JSON</Text></Pressable><Pressable onPress={() => void exportRepeated("markdown")} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>Export Markdown</Text></Pressable></View> : null}
    {lastExport ? <View><Text style={[styles.dataNote, { color: colors.muted }]}>Last shared export · {lastExport.format.toUpperCase()} · {lastExport.count} event{lastExport.count === 1 ? "" : "s"} · {lastExport.scopeLabel} · {new Date(lastExport.occurredAt).toLocaleString()}</Text><Pressable onPress={clearLastExport} accessibilityRole="button" accessibilityLabel="Clear last export summary" style={({ pressed }) => [styles.reviewButton, { borderColor: colors.border, alignSelf: "flex-start", marginTop: 6 }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>Clear export summary</Text></Pressable></View> : null}
    {authenticated ? <Text style={[styles.dataNote, { color: exportAuditSyncError ? colors.warning : colors.muted }]}>{exportAuditSyncError ?? `${exportAuditHistory.data?.length ?? 0} copy/share export audit event${(exportAuditHistory.data?.length ?? 0) === 1 ? "" : "s"} account-synced. The ledger records the action and privacy mode, not the exported content.`}</Text> : <Text style={[styles.dataNote, { color: colors.muted }]}>Copy/share actions remain on this device until sign-in; no account export ledger is available.</Text>}
    {visiblePending.length ? <View style={[styles.retryResetPending, { borderColor: colors.warning }]}><Text style={[styles.retryResetPendingTitle, { color: colors.warning }]}>Pending account synchronization</Text>{visiblePending.slice(0, 3).map((item) => { const context = listingContext.find((snapshot) => snapshot.providerListingId === item.providerListingId); return <Pressable key={item.resetId} accessibilityRole="button" accessibilityLabel={`Open history for ${context?.title ?? item.providerListingId}`} onPress={() => onOpenListing(item.providerListingId)} style={({ pressed }) => [styles.retryResetRow, pressed && styles.pressed]}><MaterialIcons name="cloud-off" size={14} color={colors.warning} /><View style={styles.settingCopy}><Text style={[styles.settingDescription, { color: colors.foreground }]} numberOfLines={1}>{context?.title ?? item.providerListingId}</Text><Text style={[styles.settingDescription, { color: colors.muted }]} numberOfLines={1}>{context?.profileSlug ? `${context.profileSlug} · ` : ""}{item.providerListingId} · attempt {item.attemptCount} · reset after {item.previousAttemptCount} provider-read attempts{item.lastError ? ` · ${item.lastError}` : ""}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>Open focused listing history</Text></View><MaterialIcons name="chevron-right" size={16} color={colors.muted} /></Pressable>; })}</View> : null}
    {visibleAudits.length ? <View style={styles.retryResetHistory}><Text style={[styles.reviewHistoryTitle, { color: colors.muted }]}>Recent account audit events</Text>{visibleAudits.map((audit) => { const context = listingContext.find((snapshot) => snapshot.providerListingId === audit.providerListingId); return <Pressable key={audit.resetId} accessibilityRole="button" accessibilityLabel={`Open history for ${context?.title ?? audit.providerListingId}`} onPress={() => onOpenListing(audit.providerListingId)} style={({ pressed }) => [styles.retryResetRow, pressed && styles.pressed]}><MaterialIcons name="restart-alt" size={14} color={colors.primary} /><View style={styles.settingCopy}><Text style={[styles.settingDescription, { color: colors.foreground }]} numberOfLines={1}>{context?.title ?? audit.providerListingId}</Text><Text style={[styles.settingDescription, { color: colors.muted }]} numberOfLines={1}>{context?.profileSlug ? `${context.profileSlug} · ` : ""}{audit.providerListingId} · reopened after {audit.previousAttemptCount} attempt{audit.previousAttemptCount === 1 ? "" : "s"}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{new Date(audit.occurredAt).toLocaleString()} · Open focused listing history</Text><Text style={[styles.reviewNoteText, { color: colors.muted }]} numberOfLines={2}>“{audit.note}”</Text></View><MaterialIcons name="chevron-right" size={16} color={colors.muted} /></Pressable>; })}</View> : <Text style={[styles.dataNote, { color: colors.muted }]}>No retry-reset audit events match this filter.</Text>}
  </View>
  <Modal visible={Boolean(exportPreview)} transparent animationType="fade" onRequestClose={() => setExportPreview(null)}>
    <View style={[styles.exportOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
      <View style={[styles.exportPreviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.exportPreviewTitle, { color: colors.foreground }]}>Review export before sharing</Text>
        <Text style={[styles.exportPreviewMeta, { color: colors.muted }]}>{exportPreview?.format.toUpperCase()} · {exportPreview?.count ?? 0} repeated retry-reset event{exportPreview?.count === 1 ? "" : "s"}</Text>
        <Text style={[styles.exportPreviewMeta, { color: colors.muted }]}>{exportPreview?.scopeLabel} · {exportPreview?.redacted ? `Redacted${exportPreview.keepTitles ? " · titles retained" : ""}${exportPreview.keepContext ? " · marketplace/profile retained" : ""}` : "Full identifiers"}</Text>
        {copiedExport ? <Text style={[styles.exportPreviewMeta, { color: colors.success }]}>Copied {copiedExport.format.toUpperCase()} · {new Date(copiedExport.occurredAt).toLocaleString()}</Text> : null}
        <Text style={[styles.exportPreviewMeta, { color: colors.muted }]} numberOfLines={2}>{exportPreview?.filename}</Text>
        <Text style={[styles.exportPreviewText, { color: exportPreview?.redacted ? colors.success : colors.warning }]}>{exportPreview?.redacted ? `Privacy mode: listing identifiers, seller data and operator notes are redacted${exportPreview.keepTitles ? "; titles retained" : ""}${exportPreview.keepContext ? "; marketplace/profile context retained" : ""}.` : "Privacy warning: this package includes provider identifiers and operator notes. Redact it before sharing outside your research group."}</Text>
        <Text style={[styles.exportPreviewText, { color: colors.muted }]}>This package contains retry evidence only. It does not establish provider recovery, listing availability, sale, stock, valuation, execution, custody or pooled-fund eligibility.</Text>
        <ScrollView style={styles.exportPreviewBody} contentContainerStyle={styles.exportPreviewBodyContent}><Text selectable style={[styles.exportPreviewText, { color: colors.foreground }]}>{getVisibleExportContent()}</Text></ScrollView>
        <View style={styles.exportPreviewActions}><Pressable onPress={() => setExportPreview(null)} style={({ pressed }) => [styles.clearCancelButton, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>Cancel</Text></Pressable><Pressable onPress={toggleExportRedaction} style={({ pressed }) => [styles.reviewButton, { borderColor: exportPreview?.redacted ? colors.primary : colors.border }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: exportPreview?.redacted ? colors.primary : colors.muted }]}>{exportPreview?.redacted ? "Show identifiers" : "Redact identifiers"}</Text></Pressable>{exportPreview?.redacted ? <><Pressable onPress={toggleExportTitles} style={({ pressed }) => [styles.reviewButton, { borderColor: exportPreview.keepTitles ? colors.primary : colors.border }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: exportPreview.keepTitles ? colors.primary : colors.muted }]}>{exportPreview.keepTitles ? "Redact titles" : "Keep titles"}</Text></Pressable><Pressable onPress={toggleExportContext} style={({ pressed }) => [styles.reviewButton, { borderColor: exportPreview.keepContext ? colors.primary : colors.border }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: exportPreview.keepContext ? colors.primary : colors.muted }]}>{exportPreview.keepContext ? "Redact context" : "Keep context"}</Text></Pressable></> : null}<Pressable onPress={() => void copyExport()} style={({ pressed }) => [styles.reviewButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.reviewButtonText, { color: colors.muted }]}>Copy</Text></Pressable><Pressable onPress={() => void shareExport()} style={({ pressed }) => [styles.clearConfirmButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.clearConfirmText, { color: colors.onPrimary }]}>Confirm share</Text></Pressable></View>
      </View>
    </View>
  </Modal>
  </>;
}

function SyncedOutcomeHistory({ colors, outcomes, authenticated, auditCount, pendingAuditSyncs, pendingSyncs, pendingRecords, dismissedRecords, onRetryPending, onRetryAudit, onClearPending, onRestorePending, retrying, retryingAudit }: { colors: ReturnType<typeof useColors>; outcomes: ListingOutcome[]; authenticated: boolean; auditCount: number; pendingAuditSyncs: number; pendingSyncs: number; pendingRecords: PendingOutcomeRecord[]; dismissedRecords: OutcomeSyncDismissal[]; onRetryPending: () => void; onRetryAudit: () => void; onClearPending: (outcomeId: string, note: string) => void; onRestorePending: (outcomeId: string, note: string) => void; retrying: boolean; retryingAudit: boolean }) {
  const [clearTarget, setClearTarget] = useState<string | null>(null);
  const [clearNote, setClearNote] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "synced" | "dismissed">("all");
  const visiblePending = statusFilter === "all" || statusFilter === "pending" ? pendingRecords : [];
  const visibleOutcomes = statusFilter === "all" || statusFilter === "synced" ? outcomes : [];
  const visibleDismissals = statusFilter === "all" || statusFilter === "dismissed" ? dismissedRecords : [];
  return <View style={[styles.outcomeHistoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.readinessHeader}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Outcome evidence history</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{authenticated ? `${outcomes.length} local/server observations reconciled` : `${outcomes.length} local observations`}{pendingSyncs ? ` · ${pendingSyncs} pending sync` : ""}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{authenticated ? `${auditCount} dismissal/restoration audit events account-synced` : "Dismissal/restoration audit events stay on this device until sign-in"}</Text></View><MaterialIcons name="fact-check" size={20} color={colors.primary} /></View>
    <Text style={[styles.dataNote, { color: colors.muted }]}>These are recorded observations, not verified market value, forecasts, or execution instructions. A realized price is evidence attached to an event, not an automatic benchmark.</Text>
    <View style={styles.filterRow}>{(["all", "pending", "synced", "dismissed"] as const).map((option) => <Pressable key={option} onPress={() => setStatusFilter(option)} style={({ pressed }) => [styles.filterChip, { backgroundColor: statusFilter === option ? colors.foreground : colors.background, borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.filterChipText, { color: statusFilter === option ? colors.background : colors.muted }]}>{option === "all" ? `All (${outcomes.length + pendingRecords.length + dismissedRecords.length})` : option === "pending" ? `Pending (${pendingRecords.length})` : option === "synced" ? `Synced (${outcomes.length})` : `Dismissed (${dismissedRecords.length})`}</Text></Pressable>)}</View>
    {authenticated && visiblePending.length ? <Pressable onPress={onRetryPending} disabled={retrying} style={({ pressed }) => [styles.retryAllButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.retryAllText, { color: colors.onPrimary }]}>{retrying ? "Retrying pending syncs…" : `Retry all pending (${visiblePending.length})`}</Text></Pressable> : null}
    {authenticated && pendingAuditSyncs ? <Pressable onPress={onRetryAudit} disabled={retryingAudit} style={({ pressed }) => [styles.retryAllButton, { backgroundColor: colors.warning }, pressed && styles.pressed]}><Text style={[styles.retryAllText, { color: colors.foreground }]}>{retryingAudit ? "Retrying audit syncs…" : `Retry audit history (${pendingAuditSyncs})`}</Text></Pressable> : null}
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
  retryResetSummaryCard: { borderRadius: 19, borderWidth: 1, padding: 14, marginBottom: 27 },
  retryResetPending: { borderWidth: 1, borderRadius: 10, padding: 9, marginTop: 12 },
  retryResetPendingTitle: { fontSize: 10, fontWeight: "800", marginBottom: 4 },
  retryResetHistory: { marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: "rgba(128,128,128,0.18)" },
  retryResetRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, minHeight: 38, marginTop: 8 },
  retryResetExportRow: { flexDirection: "row", gap: 7, marginTop: 10 },
  exportPrivacyPanel: { borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 12 },
  exportPrivacyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  exportOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  exportPreviewCard: { width: "100%", maxHeight: "86%", borderRadius: 19, borderWidth: 1, padding: 15 },
  exportPreviewTitle: { fontSize: 16, fontWeight: "900" },
  exportPreviewMeta: { fontSize: 10, lineHeight: 14, marginTop: 5 },
  exportPreviewText: { fontSize: 10, lineHeight: 15, marginTop: 9 },
  exportPreviewBody: { marginTop: 8, maxHeight: 260, borderWidth: 1, borderRadius: 9, borderColor: "rgba(128,128,128,0.2)", padding: 8 },
  exportPreviewBodyContent: { paddingBottom: 8 },
  exportPreviewActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  snapshotQueueCard: { borderRadius: 19, borderWidth: 1, padding: 14, marginBottom: 27 },
  snapshotRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, minHeight: 66, paddingTop: 10, marginTop: 8, borderTopWidth: 1 },
  snapshotActions: { gap: 6, alignItems: "flex-end" },
  snapshotMovement: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  snapshotFreshness: { fontSize: 10, lineHeight: 14, marginTop: 3, fontWeight: "700" },
  snapshotQuality: { fontSize: 10, lineHeight: 14, marginTop: 3, fontWeight: "700" },
  retryAllButton: { alignSelf: "flex-start", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  retryAllText: { fontSize: 10, fontWeight: "800" },
  pendingSyncCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 12 },
  pendingSyncTitle: { fontSize: 11, fontWeight: "800" },
  pendingSyncText: { fontSize: 10, lineHeight: 14, marginTop: 4 },
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
  bulkReviewButton: { alignSelf: "flex-start", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginTop: 9 },
  bulkReviewButtonText: { fontSize: 10, fontWeight: "800" },
  reviewNoteText: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  disabled: { opacity: 0.4 },
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
