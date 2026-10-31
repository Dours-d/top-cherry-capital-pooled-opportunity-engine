import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

type IconSymbolName =
  | "house.fill"
  | "paperplane.fill"
  | "chevron.left.forwardslash.chevron.right"
  | "chevron.right"
  | "chart.bar.fill"
  | "arrow.triangle.2.circlepath";

const nativeNames: Partial<Record<IconSymbolName, SymbolViewProps["name"]>> = {
  "paperplane.fill": "bookmark.fill",
  "chevron.left.forwardslash.chevron.right": "person.fill",
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={nativeNames[name] ?? name}
      style={[{ width: size, height: size }, style]}
    />
  );
}
