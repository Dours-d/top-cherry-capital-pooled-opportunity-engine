import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { LISTINGS, SAVED_STORAGE_KEY, formatCurrency, type Listing } from "@/lib/market-data";

export default function SavedScreen() {
  const colors = useColors();
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    void AsyncStorage.getItem(SAVED_STORAGE_KEY).then((value) => {
      if (value) setSavedIds(JSON.parse(value));
    });
  }, []);

  const savedListings = useMemo(() => LISTINGS.filter((listing) => savedIds.includes(listing.id)), [savedIds]);
  const remove = (id: string) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavedIds((current) => {
      const next = current.filter((savedId) => savedId !== id);
      void AsyncStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList
        data={savedListings}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.header}><Text style={[styles.eyebrow, { color: colors.muted }]}>YOUR SHORTLIST</Text><Text style={[styles.title, { color: colors.foreground }]}>Saved deals</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Keep your best edges close as you do your diligence.</Text></View>}
        renderItem={({ item }) => <SavedCard listing={item} colors={colors} onRemove={() => remove(item.id)} />}
        ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.primary }]}><MaterialIcons name="bookmark-border" size={24} color={colors.foreground} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved deals</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Tap the bookmark on any opportunity to build your shortlist.</Text></View>}
      />
    </ScreenContainer>
  );
}

function SavedCard({ listing, colors, onRemove }: { listing: Listing; colors: ReturnType<typeof useColors>; onRemove: () => void }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}><View style={[styles.source, { backgroundColor: colors.background }]}><Text style={[styles.sourceText, { color: colors.foreground }]}>{listing.platform.slice(0, 1)}</Text></View><View style={styles.copy}><Text style={[styles.platform, { color: colors.muted }]}>{listing.platform} · {listing.location}</Text><Text style={[styles.brand, { color: colors.foreground }]}>{listing.brand}</Text><Text style={[styles.model, { color: colors.muted }]} numberOfLines={1}>{listing.model}</Text></View><Pressable onPress={onRemove} style={({ pressed }) => pressed && { opacity: 0.55 }}><MaterialIcons name="bookmark" size={22} color={colors.primary} /></Pressable></View>
      <View style={styles.bottom}><View><Text style={[styles.label, { color: colors.muted }]}>ASKING</Text><Text style={[styles.price, { color: colors.foreground }]}>{formatCurrency(listing.askingPrice)}</Text></View><View><Text style={[styles.label, { color: colors.muted }]}>MARGIN</Text><Text style={[styles.margin, { color: colors.success }]}>+{listing.margin.toFixed(1)}%</Text></View><Pressable onPress={() => Linking.openURL(listing.url)} style={({ pressed }) => [styles.openButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.65 }]}><Text style={[styles.openButtonText, { color: colors.foreground }]}>Open</Text><MaterialIcons name="north-east" size={15} color={colors.foreground} /></Pressable></View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  header: { paddingTop: 8, paddingBottom: 28 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  title: { fontSize: 34, fontWeight: "900", letterSpacing: -1.2, marginTop: 9 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 5, maxWidth: 300 },
  card: { borderRadius: 19, borderWidth: 1, padding: 15, marginBottom: 11 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  source: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  sourceText: { fontSize: 15, fontWeight: "900" },
  copy: { flex: 1 },
  platform: { fontSize: 10, marginBottom: 3 },
  brand: { fontSize: 15, fontWeight: "800" },
  model: { fontSize: 12, marginTop: 2 },
  bottom: { flexDirection: "row", alignItems: "flex-end", marginTop: 18 },
  label: { fontSize: 9, letterSpacing: 0.8, fontWeight: "700" },
  price: { fontSize: 18, fontWeight: "800", marginTop: 3 },
  margin: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  openButton: { marginLeft: "auto", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 4 },
  openButtonText: { fontSize: 12, fontWeight: "800" },
  empty: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", marginTop: 15 },
  emptyIcon: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5, maxWidth: 250 },
});
