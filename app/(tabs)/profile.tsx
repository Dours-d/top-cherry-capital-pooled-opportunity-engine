import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { startOAuthLogin } from "@/constants/oauth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_ECONOMICS, ECONOMICS_STORAGE_KEY, type EconomicsAssumptions } from "@/lib/market-data";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();
  const preferencesQuery = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const updatePreferences = trpc.preferences.update.useMutation({ onSuccess: () => void preferencesQuery.refetch() });
  const [alerts, setAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [economics, setEconomics] = useState(DEFAULT_ECONOMICS);

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

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={[styles.eyebrow, { color: colors.muted }]}>ACCOUNT & PREFERENCES</Text><Text style={[styles.title, { color: colors.foreground }]}>Your workspace</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Tune Top Cherry around the markets you actually trade.</Text></View>
        {isAuthenticated ? <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={[styles.avatarText, { color: colors.foreground }]}>{(user?.name ?? "AR").slice(0, 2).toUpperCase()}</Text></View><View style={styles.profileCopy}><Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name ?? "Top Cherry member"}</Text><Text style={[styles.profileEmail, { color: colors.muted }]}>{user?.email ?? "Synced account"}</Text></View><Pressable onPress={() => void logout()}><Text style={[styles.logoutText, { color: colors.primary }]}>Log out</Text></Pressable></View> : <Pressable onPress={() => void startOAuthLogin()} style={({ pressed }) => [styles.loginCard, { backgroundColor: colors.primary }, pressed && styles.pressed]}><View style={styles.loginCopy}><Text style={[styles.loginTitle, { color: colors.foreground }]}>Sync your workspace</Text><Text style={[styles.loginText, { color: colors.foreground }]}>Sign in to keep saves and allocation preferences across devices.</Text></View><MaterialIcons name="arrow-forward" size={21} color={colors.foreground} /></Pressable>}
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
        <Text style={[styles.footerText, { color: colors.muted }]}>Top Cherry · Built for better buys</Text>
      </ScrollView>
    </ScreenContainer>
  );
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
  footerText: { textAlign: "center", fontSize: 11, marginTop: 2 },
  pressed: { opacity: 0.65 },
});
