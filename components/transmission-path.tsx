import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";
import type { useColors } from "@/hooks/use-colors";
import type { ThesisEvaluation } from "@/shared/evaluate-thesis";

export function TransmissionPath({ evaluation, colors }: { evaluation: ThesisEvaluation; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>TRANSMISSION PATH</Text><Text style={[styles.title, { color: colors.foreground }]}>What connects the change to the market?</Text></View><View style={[styles.status, { backgroundColor: evaluation.status === "ready" ? colors.success : colors.warning }]}><Text style={[styles.statusText, { color: colors.foreground }]}>{evaluation.status.toUpperCase()}</Text></View></View>
      {evaluation.path.map((edge, index) => <View key={edge.edgeId} style={styles.step}><View style={[styles.number, { backgroundColor: colors.background }]}><Text style={[styles.numberText, { color: colors.primary }]}>{index + 1}</Text></View><View style={styles.copy}><Text style={[styles.mechanism, { color: colors.foreground }]}>{edge.mechanism}</Text><Text style={[styles.meta, { color: colors.muted }]}>{edge.family} · {edge.evidenceStatus} evidence</Text></View></View>)}
      {evaluation.competingChannelIds.length ? <View style={[styles.note, { backgroundColor: colors.background }]}><MaterialIcons name="compare-arrows" size={16} color={colors.warning} /><Text style={[styles.noteText, { color: colors.muted }]}>Competing channels remain visible; no single directional conclusion is asserted.</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 13, marginTop: 14 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 14, fontWeight: "800", marginTop: 4, maxWidth: 220 },
  status: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 },
  statusText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 13 },
  number: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  numberText: { fontSize: 12, fontWeight: "900" },
  copy: { flex: 1 },
  mechanism: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  meta: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  note: { flexDirection: "row", gap: 7, alignItems: "flex-start", padding: 9, borderRadius: 10, marginTop: 12 },
  noteText: { flex: 1, fontSize: 10, lineHeight: 14 },
});
