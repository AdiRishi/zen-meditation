import { Image } from "expo-image";
import { useUniwind } from "uniwind";

import { LivingLandscape } from "./shaders/living-landscape";

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
  return <LivingLandscape height={height} className={className} contentPosition={contentPosition} />;
}
