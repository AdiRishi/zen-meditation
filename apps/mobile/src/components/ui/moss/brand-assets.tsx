import { Image } from "expo-image";
import { View } from "react-native";
import { useUniwind } from "uniwind";

import { cn } from "@/lib/cn";

type EnsoMarkProps = {
  size?: number;
  className?: string;
};

export function EnsoMark({ size = 112, className }: EnsoMarkProps) {
  const { theme } = useUniwind();
  return (
    <Image
      source={require("../../../../assets/brand/moss-enso.png")}
      contentFit="contain"
      className={className}
      style={{ height: size, width: size, tintColor: theme === "dark" ? "#F5F2EB" : undefined }}
      accessibilityLabel="Moss ensō"
    />
  );
}

type LandscapeArtworkProps = {
  height?: number;
  className?: string;
  contentPosition?: "center" | "bottom";
};

export function LandscapeArtwork({ height = 260, className, contentPosition = "bottom" }: LandscapeArtworkProps) {
  const { theme } = useUniwind();
  return (
    <View className={cn("overflow-hidden", className)} style={{ height }}>
      <Image
        source={
          theme === "dark"
            ? require("../../../../assets/images/mountain-lake-background-dark.png")
            : require("../../../../assets/images/mountain-lake-background.png")
        }
        contentFit="cover"
        contentPosition={contentPosition}
        style={{ height: "100%", width: "100%" }}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
