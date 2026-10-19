import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { DEFAULT_ECONOMICS, LISTINGS, getListingEconomics } from "@/lib/market-data";
import { buildDemoThesis } from "@/lib/demo-thesis";
import { createThesisDraft, reviseThesisDraft, transitionDraftStatus, type ThesisDraft } from "@/shared/versioned-drafts";
import { evaluateThesis, parseContradiction } from "@/shared/evaluate-thesis";
import { ThesisEvidence } from "@/components/thesis-evidence";
import { TransmissionPath } from "@/components/transmission-path";
import { canAllocateCandidate, reconcileThesisDrafts } from "@/shared/reconcile-drafts";

const STORAGE_KEY = "topCherry.thesisDraft.workspace";
type DraftStore = { revisions: ThesisDraft[]; current: ThesisDraft };

const nowIso = () => new Date().toISOString();
const tap = () => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

export function ThesisDraftEditor() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const syncRevision = trpc.thesisDrafts.upsert.useMutation();
  const remoteDrafts = trpc.thesisDrafts.list.useQuery({ draftId: "workspace-thesis-1" }, { enabled: isAuthenticated });
  const [store, setStore] = useState<DraftStore | null>(null);
  const [claim, setClaim] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [unknownsText, setUnknownsText] = useState("");
  const [invalidationText, setInvalidationText] = useState("");
  const [contradictionSource, setContradictionSource] = useState("");
  const [contradictionSeverity, setContradictionSeverity] = useState<"low" | "medium" | "high">("medium");
  const [contradictionText, setContradictionText] = useState("");
  const [syncConflict, setSyncConflict] = useState(false);
  const [conflictDrafts, setConflictDrafts] = useState<{ local: ThesisDraft; remote: ThesisDraft } | null>(null);
  const listing = LISTINGS[0];
  const demo = useMemo(() => buildDemoThesis(listing), [listing]);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as DraftStore;
          setStore(parsed);
          setClaim(parsed.current.thesis.claim);
          setSelectedEvidenceIds(parsed.current.thesis.observationIds);
          setUnknownsText(parsed.current.thesis.unknowns.join("\n"));
          setInvalidationText(parsed.current.thesis.invalidationConditions.join("\n"));
          return;
        } catch {
          // Reset invalid local state to the transparent demonstration draft.
        }
      }
      const initial = createThesisDraft({ draftId: "workspace-thesis-1", thesis: demo.thesis, createdAt: nowIso(), createdBy: "local analyst", changeSummary: "Initial read-only demonstration thesis" });
      const next = { revisions: [initial], current: initial };
      setStore(next);
      setClaim(initial.thesis.claim);
      setSelectedEvidenceIds(initial.thesis.observationIds);
      setUnknownsText(initial.thesis.unknowns.join("\n"));
      setInvalidationText(initial.thesis.invalidationConditions.join("\n"));
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    });
  }, [demo.thesis]);

  useEffect(() => {
    if (!store || !remoteDrafts.data?.length) return;
    const remote = remoteDrafts.data.map((row) => row.payload as ThesisDraft);
    const result = reconcileThesisDrafts(store.revisions, remote);
    if (result.status === "conflict") {
      setSyncConflict(true);
      setConflictDrafts({ local: result.local, remote: result.remote });
      return;
    }
    if (result.status === "merged" && result.store.current.revision > store.current.revision) {
      setStore(result.store);
      setClaim(result.store.current.thesis.claim);
      setSelectedEvidenceIds(result.store.current.thesis.observationIds);
      setUnknownsText(result.store.current.thesis.unknowns.join("\n"));
      setInvalidationText(result.store.current.thesis.invalidationConditions.join("\n"));
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result.store));
    }
  }, [remoteDrafts.data, store]);

  const persist = (next: DraftStore) => {
    setStore(next);
    setClaim(next.current.thesis.claim);
    setSelectedEvidenceIds(next.current.thesis.observationIds);
    setUnknownsText(next.current.thesis.unknowns.join("\n"));
    setInvalidationText(next.current.thesis.invalidationConditions.join("\n"));
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (isAuthenticated) {
      syncRevision.mutate({ draftId: next.current.draftId, revision: next.current.revision, status: next.current.status, payload: next.current });
    }
  };

  const resolveSyncConflict = (choice: "local" | "remote") => {
    if (!store || !conflictDrafts) return;
    const selected = choice === "local" ? conflictDrafts.local : conflictDrafts.remote;
    const next = { revisions: store.revisions.filter((revision) => revision.revision !== selected.revision).concat(selected).sort((a, b) => a.revision - b.revision), current: selected };
    setSyncConflict(false);
    setConflictDrafts(null);
    persist(next);
  };

  const saveRevision = () => {
    if (!store || store.current.status !== "draft" || !claim.trim() || !changeSummary.trim()) return;
    tap();
    const structuredContradiction = contradictionText.trim()
      ? `[contradiction|${contradictionSeverity}|${contradictionSource.trim() || "unspecified source"}] ${contradictionText.trim()}`
      : null;
    const unknowns = unknownsText.split("\n").map((value) => value.trim()).filter(Boolean).filter((value) => !value.startsWith("[contradiction|"));
    if (structuredContradiction) unknowns.push(structuredContradiction);
    const nextThesis = {
      ...store.current.thesis,
      claim: claim.trim(),
      observationIds: selectedEvidenceIds,
      unknowns,
      invalidationConditions: invalidationText.split("\n").map((value) => value.trim()).filter(Boolean),
    };
    const revision = reviseThesisDraft(store.current, { thesis: nextThesis, createdAt: nowIso(), createdBy: "local analyst", changeSummary: changeSummary.trim() });
    persist({ revisions: [...store.revisions, revision], current: revision });
    setChangeSummary("");
    setContradictionText("");
    setContradictionSource("");
  };

  const transition = (status: "submitted" | "archived") => {
    if (!store) return;
    if (status === "submitted" && (currentEvaluation.status === "invalid" || currentEvaluation.status === "blocked" || !invalidationText.trim())) {
      Alert.alert("Submission blocked", "Resolve invalid or contradictory evidence and add at least one invalidation condition before submitting for review.");
      return;
    }
    tap();
    const next = transitionDraftStatus(store.current, status) as ThesisDraft;
    persist({ ...store, current: next });
  };

  const restoreRevision = (revision: ThesisDraft) => {
    if (!store || !editable || revision.revision === current.revision) return;
    Alert.alert("Restore as a new revision", `Use revision ${revision.revision} as the next draft without deleting newer history?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Restore", onPress: () => {
        const restored = reviseThesisDraft(current, { thesis: revision.thesis, createdAt: nowIso(), createdBy: "local analyst", changeSummary: `Restored from revision ${revision.revision}` });
        persist({ revisions: [...store.revisions, restored], current: restored });
      } },
    ]);
  };

  if (!store) return <Text style={[styles.loading, { color: colors.muted }]}>Loading local thesis draft…</Text>;
  const current = store.current;
  const editable = current.status === "draft";
  const currentEvaluation = evaluateThesis({ nodes: demo.nodes, edges: demo.edges, exposures: [], observations: demo.observations, thesis: { ...current.thesis, observationIds: selectedEvidenceIds, unknowns: unknownsText.split("\n").map((value) => value.trim()).filter(Boolean), invalidationConditions: invalidationText.split("\n").map((value) => value.trim()).filter(Boolean) } });
  const structuredContradictions = unknownsText.split("\n").map((value) => value.trim()).filter(Boolean).map((value, index) => ({ value, index, parsed: parseContradiction(value) })).filter((entry) => entry.parsed);
  const candidateEconomics = getListingEconomics(listing, DEFAULT_ECONOMICS);
  const candidateFeasible = canAllocateCandidate({ thesisStatus: currentEvaluation.status, candidateVerified: listing.verified, escrowProtected: listing.escrowProtected, netUpside: candidateEconomics.netUpside, budget: 30000, askingPrice: listing.askingPrice, reserve: 1000 });
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>R1.5B · LOCAL DRAFT</Text><Text style={[styles.title, { color: colors.foreground }]}>Thesis workspace</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Research-only, versioned and stored on this device.</Text></View>
        <View style={[styles.status, { backgroundColor: current.status === "draft" ? colors.primary : colors.warning }]}><Text style={[styles.statusText, { color: colors.foreground }]}>{current.status.toUpperCase()}</Text></View>
      </View>
      <View style={styles.metaRow}><Text style={[styles.meta, { color: colors.muted }]}>Revision {current.revision} · {store.revisions.length} saved version{store.revisions.length === 1 ? "" : "s"}</Text><Text style={[styles.meta, { color: colors.muted }]}>{current.createdBy}</Text></View>
      {isAuthenticated ? <Text style={[styles.syncStatus, { color: syncConflict ? colors.error : colors.success }]}>{syncConflict ? "Sync conflict detected — local and remote revisions need review." : remoteDrafts.isFetching ? "Syncing revisions…" : "Authenticated revision sync active"}</Text> : null}
      {syncConflict && conflictDrafts ? <View style={[styles.conflictCard, { backgroundColor: colors.background, borderColor: colors.error }]}><Text style={[styles.conflictTitle, { color: colors.error }]}>Choose the revision to keep</Text><Text style={[styles.conflictText, { color: colors.muted }]}>Device and server differ at revision {conflictDrafts.local.revision}. Nothing is overwritten until you choose.</Text><View style={styles.conflictActions}><Pressable onPress={() => resolveSyncConflict("local")} style={[styles.conflictButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.conflictButtonText, { color: colors.foreground }]}>Keep device</Text></Pressable><Pressable onPress={() => resolveSyncConflict("remote")} style={[styles.conflictButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={[styles.conflictButtonText, { color: colors.foreground }]}>Use server</Text></Pressable></View></View> : null}
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Claim</Text>
      <TextInput multiline editable={editable} value={claim} onChangeText={setClaim} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} placeholder="State the thesis carefully" placeholderTextColor={colors.muted} />
      {editable ? <><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Change summary</Text><TextInput value={changeSummary} onChangeText={setChangeSummary} style={[styles.input, styles.singleLine, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} placeholder="What changed?" placeholderTextColor={colors.muted} /></> : <View style={[styles.locked, { backgroundColor: colors.background }]}><MaterialIcons name="lock" size={15} color={colors.warning} /><Text style={[styles.lockedText, { color: colors.muted }]}>This revision is {current.status}; create a new draft before editing.</Text></View>}
      {editable ? <><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Contradictions and unknowns</Text><TextInput multiline value={unknownsText} onChangeText={setUnknownsText} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} placeholder="One uncertainty per line" placeholderTextColor={colors.muted} />{structuredContradictions.map(({ value, index, parsed }) => parsed ? <View key={`${value}-${index}`} style={[styles.resolutionRow, { backgroundColor: colors.background, borderColor: colors.border }]}><View style={styles.resolutionCopy}><Text style={[styles.resolutionText, { color: colors.foreground }]} numberOfLines={2}>{parsed.description}</Text><Text style={[styles.evidenceMeta, { color: colors.muted }]}>{parsed.source} · {parsed.severity} · {parsed.status}</Text></View><Pressable onPress={() => { const lines = unknownsText.split("\n"); lines[index] = `[contradiction|${parsed.severity}|${parsed.source}][status:${parsed.status === "resolved" ? "open" : "resolved"}] ${parsed.description}`; setUnknownsText(lines.join("\n")); }} style={[styles.severityChip, { backgroundColor: parsed.status === "resolved" ? colors.success : colors.warning, borderColor: colors.border }]}><Text style={[styles.severityText, { color: colors.foreground }]}>{parsed.status === "resolved" ? "Reopen" : "Resolve"}</Text></Pressable></View> : null)}<View style={[styles.contradictionCard, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.contradictionTitle, { color: colors.foreground }]}>Add contradictory evidence</Text><TextInput value={contradictionText} onChangeText={setContradictionText} style={[styles.input, styles.contradictionInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="What conflicts with the thesis?" placeholderTextColor={colors.muted} /><View style={styles.contradictionRow}><TextInput value={contradictionSource} onChangeText={setContradictionSource} style={[styles.compactInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="Source" placeholderTextColor={colors.muted} /><View style={styles.severityRow}>{(["low", "medium", "high"] as const).map((level) => <Pressable key={level} onPress={() => setContradictionSeverity(level)} style={[styles.severityChip, { backgroundColor: contradictionSeverity === level ? colors.warning : colors.surface, borderColor: colors.border }]}><Text style={[styles.severityText, { color: colors.foreground }]}>{level}</Text></Pressable>)}</View></View><Text style={[styles.helperText, { color: colors.muted }]}>Saved with the next revision and treated as a review blocker until resolved.</Text></View><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Invalidation conditions</Text><TextInput multiline value={invalidationText} onChangeText={setInvalidationText} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} placeholder="What would make this thesis no longer valid?" placeholderTextColor={colors.muted} /></> : null}
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Evidence actions</Text>
      {demo.observations.map((observation) => {
        const attached = selectedEvidenceIds.includes(observation.id);
        return <View key={observation.id} style={[styles.evidenceRow, { backgroundColor: colors.background, borderColor: colors.border }]}><View style={styles.evidenceCopy}><Text style={[styles.evidenceMetric, { color: colors.foreground }]}>{observation.metric.replaceAll("-", " ")}</Text><Text style={[styles.evidenceMeta, { color: colors.muted }]}>{observation.value} {observation.unit} · {observation.vintage}</Text></View><Pressable onPress={() => { if (!editable) return; tap(); setSelectedEvidenceIds((ids) => attached ? ids.filter((id) => id !== observation.id) : [...ids, observation.id]); }} style={({ pressed }) => [styles.evidenceAction, { borderColor: attached ? colors.success : colors.border }, pressed && styles.pressed]}><Text style={[styles.evidenceActionText, { color: attached ? colors.success : colors.foreground }]}>{attached ? "Attached" : "Attach"}</Text></Pressable><Pressable onPress={() => Alert.alert("Source inspection", `${observation.provenance.sourceName}\n\n${observation.provenance.reference ?? "No additional source reference."}\n\nEvent: ${observation.eventTime}\nVintage: ${observation.vintage}`)} accessibilityLabel="Inspect evidence source" style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}><MaterialIcons name="info-outline" size={18} color={colors.primary} /></Pressable></View>;
      })}
      <Text style={[styles.readiness, { color: currentEvaluation.status === "ready" ? colors.success : colors.warning }]}>Evaluator readiness: {currentEvaluation.status.toUpperCase()} · {currentEvaluation.readinessReasons[0] ?? "Evidence set is complete for this draft."}</Text>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Candidate linkage</Text>
      <View style={[styles.candidateCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.candidateCopy}><Text style={[styles.candidateTitle, { color: colors.foreground }]}>{listing.brand} {listing.model}</Text><Text style={[styles.candidateMeta, { color: colors.muted }]}>{listing.platform} · {listing.location} · {listing.verified ? "verified" : "verification needed"}</Text><Text style={[styles.candidateStatus, { color: candidateFeasible ? colors.success : colors.warning }]}>{candidateFeasible ? "Purchase feasible at current sample assumptions" : "Blocked: verify protection, price or net economics"}</Text></View>
        <Pressable disabled={!candidateFeasible} onPress={() => { tap(); router.push({ pathname: "/plan", params: { candidate: listing.id } }); }} style={({ pressed }) => [styles.planAction, { backgroundColor: candidateFeasible ? colors.primary : colors.border, opacity: candidateFeasible ? 1 : 0.55 }, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={17} color={colors.foreground} /><Text style={[styles.planActionText, { color: colors.foreground }]}>Plan</Text></Pressable>
      </View>
      <Text style={[styles.disclaimer, { color: colors.muted }]}>Thesis readiness and purchase feasibility are separate. Plan still applies its own budget, quantity and reserve constraints.</Text>
      <Text style={[styles.historyTitle, { color: colors.foreground }]}>Revision history</Text>
      {store.revisions.slice().reverse().map((revision) => <View key={`${revision.draftId}-${revision.revision}`} style={[styles.revisionRow, { backgroundColor: colors.background, borderColor: revision.revision === current.revision ? colors.primary : colors.border }]}><View style={styles.revisionCopy}><Text style={[styles.revisionTitle, { color: colors.foreground }]}>Revision {revision.revision} · {revision.status}</Text><Text style={[styles.revisionSummary, { color: colors.muted }]} numberOfLines={2}>{revision.changeSummary}</Text></View>{revision.revision !== current.revision ? <Pressable disabled={!editable} onPress={() => restoreRevision(revision)} style={({ pressed }) => [styles.restoreButton, { borderColor: editable ? colors.border : colors.background, opacity: editable ? 1 : 0.45 }, pressed && styles.pressed]}><Text style={[styles.restoreText, { color: colors.foreground }]}>Restore</Text></Pressable> : <Text style={[styles.currentText, { color: colors.success }]}>Current</Text>}</View>)}
      <View style={styles.actions}>
        {editable ? <Pressable onPress={saveRevision} disabled={!claim.trim() || !changeSummary.trim()} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary, opacity: !claim.trim() || !changeSummary.trim() ? 0.45 : 1 }, pressed && styles.pressed]}><MaterialIcons name="save" size={17} color={colors.foreground} /><Text style={[styles.actionText, { color: colors.foreground }]}>Save revision</Text></Pressable> : null}
        {editable ? <Pressable onPress={() => Alert.alert("Submit thesis", "This marks the current research draft as submitted for review. It does not authorize a trade, pooling or execution.", [{ text: "Cancel", style: "cancel" }, { text: "Submit", onPress: () => transition("submitted") }])} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryText, { color: colors.foreground }]}>Submit for review</Text></Pressable> : <Pressable onPress={() => transition("archived")} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryText, { color: colors.foreground }]}>Archive</Text></Pressable>}
      </View>
      <Text style={[styles.historyTitle, { color: colors.foreground }]}>Evidence snapshot</Text>
      <TransmissionPath evaluation={currentEvaluation} colors={colors} />
      <ThesisEvidence evaluation={currentEvaluation} sourceLabel="Sample signals" colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 27 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: "900", marginTop: 5 },
  subtitle: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  status: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  statusText: { fontSize: 8, fontWeight: "900" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 12 },
  meta: { fontSize: 9 },
  syncStatus: { fontSize: 9, lineHeight: 13, marginTop: 5 },
  conflictCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8 },
  conflictTitle: { fontSize: 11, fontWeight: "900" },
  conflictText: { fontSize: 10, lineHeight: 14, marginTop: 4 },
  conflictActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  conflictButton: { flex: 1, borderWidth: 1, borderRadius: 9, paddingVertical: 8, alignItems: "center" },
  conflictButtonText: { fontSize: 10, fontWeight: "800" },
  fieldLabel: { fontSize: 11, fontWeight: "800", marginTop: 14, marginBottom: 6 },
  input: { minHeight: 76, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12, lineHeight: 18, textAlignVertical: "top" },
  singleLine: { minHeight: 43, textAlignVertical: "center" },
  contradictionCard: { borderWidth: 1, borderRadius: 12, padding: 9, marginTop: 8 },
  contradictionTitle: { fontSize: 10, fontWeight: "900", marginBottom: 7 },
  contradictionInput: { minHeight: 48, marginBottom: 7 },
  contradictionRow: { flexDirection: "row", gap: 7, alignItems: "center" },
  compactInput: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, fontSize: 10 },
  severityRow: { flexDirection: "row", gap: 4 },
  severityChip: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 6 },
  severityText: { fontSize: 8, fontWeight: "800", textTransform: "capitalize" },
  helperText: { fontSize: 8, lineHeight: 12, marginTop: 6 },
  resolutionRow: { borderWidth: 1, borderRadius: 10, padding: 8, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 7 },
  resolutionCopy: { flex: 1 },
  resolutionText: { fontSize: 10, lineHeight: 14, fontWeight: "700" },
  evidenceRow: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 },
  evidenceCopy: { flex: 1 },
  evidenceMetric: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  evidenceMeta: { fontSize: 9, marginTop: 3 },
  evidenceAction: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  evidenceActionText: { fontSize: 9, fontWeight: "900" },
  sourceButton: { padding: 4 },
  readiness: { fontSize: 10, lineHeight: 15, marginTop: 6 },
  candidateCard: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  candidateCopy: { flex: 1 },
  candidateTitle: { fontSize: 11, fontWeight: "800" },
  candidateMeta: { fontSize: 9, marginTop: 3 },
  candidateStatus: { fontSize: 9, lineHeight: 13, marginTop: 4 },
  planAction: { borderRadius: 9, minWidth: 58, minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  planActionText: { fontSize: 10, fontWeight: "900" },
  disclaimer: { fontSize: 9, lineHeight: 14, marginTop: 7 },
  locked: { flexDirection: "row", alignItems: "center", gap: 7, padding: 10, borderRadius: 10, marginTop: 12 },
  lockedText: { flex: 1, fontSize: 10, lineHeight: 14 },
  actions: { flexDirection: "row", gap: 8, marginTop: 13 },
  primaryAction: { flex: 1, minHeight: 43, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secondaryAction: { flex: 1, minHeight: 43, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 11, fontWeight: "900" },
  secondaryText: { fontSize: 11, fontWeight: "800" },
  historyTitle: { fontSize: 13, fontWeight: "900", marginTop: 20 },
  revisionRow: { borderWidth: 1, borderRadius: 11, padding: 9, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7 },
  revisionCopy: { flex: 1 },
  revisionTitle: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  revisionSummary: { fontSize: 9, lineHeight: 13, marginTop: 3 },
  restoreButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  restoreText: { fontSize: 9, fontWeight: "900" },
  currentText: { fontSize: 9, fontWeight: "900" },
  loading: { fontSize: 11, marginBottom: 20 },
  pressed: { opacity: 0.7 },
});
