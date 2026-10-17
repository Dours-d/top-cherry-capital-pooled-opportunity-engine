import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { LISTINGS } from "@/lib/market-data";
import { buildDemoThesis } from "@/lib/demo-thesis";
import { createThesisDraft, reviseThesisDraft, transitionDraftStatus, type ThesisDraft } from "@/shared/versioned-drafts";
import { ThesisEvidence } from "@/components/thesis-evidence";
import { TransmissionPath } from "@/components/transmission-path";

const STORAGE_KEY = "topCherry.thesisDraft.workspace";
type DraftStore = { revisions: ThesisDraft[]; current: ThesisDraft };

const nowIso = () => new Date().toISOString();
const tap = () => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

export function ThesisDraftEditor() {
  const colors = useColors();
  const [store, setStore] = useState<DraftStore | null>(null);
  const [claim, setClaim] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const listing = LISTINGS[0];
  const demo = useMemo(() => buildDemoThesis(listing), [listing]);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as DraftStore;
          setStore(parsed);
          setClaim(parsed.current.thesis.claim);
          return;
        } catch {
          // Reset invalid local state to the transparent demonstration draft.
        }
      }
      const initial = createThesisDraft({ draftId: "workspace-thesis-1", thesis: demo.thesis, createdAt: nowIso(), createdBy: "local analyst", changeSummary: "Initial read-only demonstration thesis" });
      const next = { revisions: [initial], current: initial };
      setStore(next);
      setClaim(initial.thesis.claim);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    });
  }, [demo.thesis]);

  const persist = (next: DraftStore) => {
    setStore(next);
    setClaim(next.current.thesis.claim);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveRevision = () => {
    if (!store || store.current.status !== "draft" || !claim.trim() || !changeSummary.trim()) return;
    tap();
    const nextThesis = { ...store.current.thesis, claim: claim.trim() };
    const revision = reviseThesisDraft(store.current, { thesis: nextThesis, createdAt: nowIso(), createdBy: "local analyst", changeSummary: changeSummary.trim() });
    persist({ revisions: [...store.revisions, revision], current: revision });
    setChangeSummary("");
  };

  const transition = (status: "submitted" | "archived") => {
    if (!store) return;
    tap();
    const next = transitionDraftStatus(store.current, status) as ThesisDraft;
    persist({ ...store, current: next });
  };

  if (!store) return <Text style={[styles.loading, { color: colors.muted }]}>Loading local thesis draft…</Text>;
  const current = store.current;
  const editable = current.status === "draft";
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>R1.5B · LOCAL DRAFT</Text><Text style={[styles.title, { color: colors.foreground }]}>Thesis workspace</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Research-only, versioned and stored on this device.</Text></View>
        <View style={[styles.status, { backgroundColor: current.status === "draft" ? colors.primary : colors.warning }]}><Text style={[styles.statusText, { color: colors.foreground }]}>{current.status.toUpperCase()}</Text></View>
      </View>
      <View style={styles.metaRow}><Text style={[styles.meta, { color: colors.muted }]}>Revision {current.revision} · {store.revisions.length} saved version{store.revisions.length === 1 ? "" : "s"}</Text><Text style={[styles.meta, { color: colors.muted }]}>{current.createdBy}</Text></View>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Claim</Text>
      <TextInput multiline editable={editable} value={claim} onChangeText={setClaim} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} placeholder="State the thesis carefully" placeholderTextColor={colors.muted} />
      {editable ? <><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Change summary</Text><TextInput value={changeSummary} onChangeText={setChangeSummary} style={[styles.input, styles.singleLine, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} placeholder="What changed?" placeholderTextColor={colors.muted} /></> : <View style={[styles.locked, { backgroundColor: colors.background }]}><MaterialIcons name="lock" size={15} color={colors.warning} /><Text style={[styles.lockedText, { color: colors.muted }]}>This revision is {current.status}; create a new draft before editing.</Text></View>}
      <View style={styles.actions}>
        {editable ? <Pressable onPress={saveRevision} disabled={!claim.trim() || !changeSummary.trim()} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary, opacity: !claim.trim() || !changeSummary.trim() ? 0.45 : 1 }, pressed && styles.pressed]}><MaterialIcons name="save" size={17} color={colors.foreground} /><Text style={[styles.actionText, { color: colors.foreground }]}>Save revision</Text></Pressable> : null}
        {editable ? <Pressable onPress={() => Alert.alert("Submit thesis", "This marks the current research draft as submitted for review. It does not authorize a trade, pooling or execution.", [{ text: "Cancel", style: "cancel" }, { text: "Submit", onPress: () => transition("submitted") }])} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryText, { color: colors.foreground }]}>Submit for review</Text></Pressable> : <Pressable onPress={() => transition("archived")} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryText, { color: colors.foreground }]}>Archive</Text></Pressable>}
      </View>
      <Text style={[styles.historyTitle, { color: colors.foreground }]}>Evidence snapshot</Text>
      <TransmissionPath evaluation={demo.evaluation} colors={colors} />
      <ThesisEvidence evaluation={demo.evaluation} sourceLabel="Sample signals" colors={colors} />
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
  fieldLabel: { fontSize: 11, fontWeight: "800", marginTop: 14, marginBottom: 6 },
  input: { minHeight: 76, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12, lineHeight: 18, textAlignVertical: "top" },
  singleLine: { minHeight: 43, textAlignVertical: "center" },
  locked: { flexDirection: "row", alignItems: "center", gap: 7, padding: 10, borderRadius: 10, marginTop: 12 },
  lockedText: { flex: 1, fontSize: 10, lineHeight: 14 },
  actions: { flexDirection: "row", gap: 8, marginTop: 13 },
  primaryAction: { flex: 1, minHeight: 43, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secondaryAction: { flex: 1, minHeight: 43, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 11, fontWeight: "900" },
  secondaryText: { fontSize: 11, fontWeight: "800" },
  historyTitle: { fontSize: 13, fontWeight: "900", marginTop: 20 },
  loading: { fontSize: 11, marginBottom: 20 },
  pressed: { opacity: 0.7 },
});
