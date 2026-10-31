// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { type ColorValue, type StyleProp, type TextStyle } from "react-native";

type IconSymbolName =
  | "house.fill"
  | "paperplane.fill"
  | "chevron.left.forwardslash.chevron.right"
  | "chevron.right"
  | "chart.bar.fill"
  | "arrow.triangle.2.circlepath";

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "bookmark",
  "chevron.left.forwardslash.chevron.right": "person",
  "chevron.right": "chevron-right",
  "chart.bar.fill": "bar-chart",
  "arrow.triangle.2.circlepath": "sync",
} satisfies Record<IconSymbolName, ComponentProps<typeof MaterialIcons>["name"]>;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color as unknown as string} size={size} name={MAPPING[name]} style={style} />;
}
