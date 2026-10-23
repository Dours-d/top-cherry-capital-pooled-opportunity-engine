import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: tabBarHeight, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 0.5 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Discover", tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="reconcile" options={{ title: "Reconcile", tabBarIcon: ({ color }) => <IconSymbol size={24} name="arrow.triangle.2.circlepath" color={color} /> }} />
      <Tabs.Screen name="plan" options={{ title: "Plan", tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} /> }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: ({ color }) => <IconSymbol size={24} name="paperplane.fill" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Workspace", tabBarIcon: ({ color }) => <IconSymbol size={24} name="chevron.left.forwardslash.chevron.right" color={color} /> }} />
    </Tabs>
  );
}
