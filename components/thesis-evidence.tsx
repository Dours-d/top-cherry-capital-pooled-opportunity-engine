import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";
import type { useColors } from "@/hooks/use-colors";
import type { ThesisEvaluation } from "@/shared/evaluate-thesis";

export function ThesisEvidence({ evaluation, sourceLabel, colors }: { evaluation: ThesisEvaluation; sourceLabel: string; colors: ReturnType<typeof useColors> }) {
  const rows = [
    { icon: "check-circle", label: "Supporting observations", value: String(evaluation.supportingEvidence.length), color: colors.success },
    { icon: "help-outline", label: "Missing observations", value: String(evaluation.missingObservationIds.length), color: evaluation.missingObservationIds.length ? colors.warning : colors.success },
    { icon: "report-problem", label: "Contradictory evidence", value: String(evaluation.contradictoryEvidence.length), color: evaluation.contradictoryEvidence.length ? colors.error : colors.success },
  ] as const;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>EVIDENCE STATUS</Text><Text style={[styles.title, { color: colors.foreground }]}>What is known and unknown</Text></View><Text style={[styles.source, { color: colors.muted }]}>{sourceLabel}</Text></View>
      {rows.map((row) => <View key={row.label} style={styles.row}><MaterialIcons name={row.icon} size={16} color={row.color} /><Text style={[styles.label, { color: colors.foreground }]}>{row.label}</Text><Text style={[styles.value, { color: row.color }]}>{row.value}</Text></View>)}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.subheading, { color: colors.foreground }]}>Unknowns that affect the decision</Text>
      {evaluation.unknowns.map((unknown) => <View key={unknown} style={styles.bullet}><Text style={[styles.bulletMark, { color: colors.primary }]}>•</Text><Text style={[styles.unknown, { color: colors.muted }]}>{unknown}</Text></View>)}
      <Text style={[styles.subheading, { color: colors.foreground, marginTop: 10 }]}>Invalidation conditions</Text>
      {evaluation.path.length ? <Text style={[styles.invalidation, { color: colors.muted }]}>Re-evaluate if {evaluation.path.map((item) => item.edgeId).join(", ")} loses its stated evidence or if its conditions no longer apply.</Text> : null}
      {evaluation.readinessReasons.map((reason) => <Text key={reason} style={[styles.reason, { color: colors.warning }]}>{reason}</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 13, marginTop: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  source: { fontSize: 9, maxWidth: 100, textAlign: "right", lineHeight: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 29 },
  label: { flex: 1, fontSize: 11 },
  value: { fontSize: 12, fontWeight: "900" },
  divider: { height: 1, marginVertical: 7 },
  subheading: { fontSize: 11, fontWeight: "800", marginBottom: 5 },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  bulletMark: { fontSize: 15, lineHeight: 16 },
  unknown: { flex: 1, fontSize: 10, lineHeight: 15 },
  invalidation: { fontSize: 10, lineHeight: 15 },
  reason: { fontSize: 10, lineHeight: 14, marginTop: 7 },
});
