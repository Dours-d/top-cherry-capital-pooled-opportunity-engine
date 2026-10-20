import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { deliveryLabel, displayCount, displayReceivedAt } from "@/shared/monitor-display";

export function EbayMonitor() {
  const colors = useColors();
  const query = trpc.monitoring.ebay.useQuery(undefined, { refetchInterval: 30_000, retry: 1 });
  const data = query.isError ? undefined : query.data;
  const label = deliveryLabel(query.isLoading, query.isError, data?.summary.lastReceivedAt);
  const good = label === "RECEIVED";
  const topicStatus = (id: string) => data?.subscriptions.topics.find((topic) => topic.topicId === id)?.status ?? "UNKNOWN";
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <MaterialIcons name="sensors" size={23} color={colors.primary} />
        <View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>eBay notification monitor</Text><Text style={[styles.note, { color: colors.muted }]}>Verified deliveries · auto-refresh every 30s</Text></View>
        <View style={[styles.badge, { backgroundColor: good ? colors.success : colors.warning }]}><Text style={styles.badgeText}>{label}</Text></View>
      </View>
      <View style={styles.stats}>
        <Stat label="Verified events" value={displayCount(data?.summary.notifications)} />
        <Stat label="Listing events" value={displayCount(data?.summary.listingEvents)} />
      </View>
      {query.isError ? <Text style={[styles.note, { color: colors.error }]}>Monitoring unavailable. No counts or delivery status can be confirmed. Retry below.</Text> : <Text style={[styles.note, { color: colors.muted }]}>Last received: {displayReceivedAt(data?.summary.lastReceivedAt)}</Text>}
      <Text style={[styles.section, { color: colors.foreground }]}>Subscription access</Text>
      <TopicRow title="Account deletion" status={topicStatus("MARKETPLACE_ACCOUNT_DELETION")} />
      <TopicRow title="Item availability" status={topicStatus("ITEM_AVAILABILITY")} />
      <TopicRow title="Price revision" status={topicStatus("ITEM_PRICE_REVISION")} />
      <Text style={[styles.note, { color: colors.muted }]}>{data?.subscriptions.message ?? "Fetching the current eBay subscription status…"}</Text>
      <Text style={[styles.section, { color: colors.foreground }]}>Observed market signals</Text>
      <View style={styles.stats}>
        <Stat label="Price drops" value={displayCount(data?.market.priceDrops)} />
        <Stat label="Price rises" value={displayCount(data?.market.priceRises)} />
        <Stat label="Unavailable" value={displayCount(data?.market.unavailable)} />
      </View>
      <Text style={[styles.note, { color: colors.muted }]}>{data?.market.observations ? data.observationWindow : "No verified listing observations yet. The opportunity feed remains sample data; account-deletion events are not listing signals."}</Text>
      <Text style={[styles.note, { color: colors.muted }]}>A missing listing is not proof of a sale. Currency-matched price history is required before direction is reported.</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh eBay monitoring" disabled={query.isFetching} onPress={() => void query.refetch()} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary }, pressed && styles.pressed]}><MaterialIcons name="refresh" size={18} color={colors.onPrimary} /><Text style={[styles.buttonText, { color: colors.onPrimary }]}>{query.isFetching ? "Checking…" : "Refresh"}</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://developer.ebay.com/develop/api/buy/notification_events")} style={({ pressed }) => [styles.link, pressed && styles.pressed]}><Text style={[styles.buttonText, { color: colors.muted }]}>Access requirements</Text></Pressable>
      </View>
    </View>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={styles.stat}><Text style={[styles.value, { color: colors.foreground }]}>{value}</Text><Text style={[styles.note, { color: colors.muted }]}>{label}</Text></View>;
}
function TopicRow({ title, status }: { title: string; status: string }) {
  const colors = useColors();
  return <View style={styles.topic}><Text style={[styles.topicTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.topicState, { color: status === "ENABLED" ? colors.success : colors.warning }]}>{status.replaceAll("_", " ")}</Text></View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 19, borderWidth: 1, padding: 16, marginBottom: 27 },
  header: { flexDirection: "row", alignItems: "center", gap: 9 }, copy: { flex: 1 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: "800" }, note: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  badge: { borderRadius: 8, padding: 6 }, badgeText: { color: "#162016", fontSize: 8, lineHeight: 12, fontWeight: "800" },
  stats: { flexDirection: "row", gap: 12, marginVertical: 12 }, stat: { flex: 1 }, value: { fontSize: 23, lineHeight: 30, fontWeight: "800" },
  section: { marginTop: 17, marginBottom: 5, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  topic: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, gap: 8 },
  topicTitle: { flex: 1, fontSize: 12, lineHeight: 18 }, topicState: { fontSize: 9, lineHeight: 14, fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }, button: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 12 },
  buttonText: { fontSize: 11, lineHeight: 17, fontWeight: "700" }, link: { justifyContent: "center", padding: 8 }, pressed: { opacity: 0.65 },
});
