import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useCallback, useMemo } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { useUniwind } from "uniwind";

import { cn } from "@/lib/cn";
import { useMeditation } from "@/providers/meditation-provider";

import { hexToVec3, type Vec3 } from "./color";
import { useShaderClock } from "./use-shader-clock";

/**
 * A procedural rendition of the Moss mountain-lake artwork.
 *
 * The silhouettes are static — only the atmosphere moves: mist drifts through
 * the valley, the horizon light breathes on a slow cycle, and the light path
 * on the water shimmers. All motion is driven on the UI thread.
 */
const LANDSCAPE_SKSL = `
uniform float2 uResolution;
uniform float  uTime;
uniform float  uHorizon;
uniform float  uMotion;
uniform float3 uSkyTop;
uniform float3 uSkyHorizon;
uniform float3 uGlow;
uniform float  uGlowStrength;
uniform float3 uRidgeFar;
uniform float3 uRidgeNear;
uniform float3 uMistColor;
uniform float  uMistAmount;
uniform float3 uWater;

float hash(float2 p) {
  float3 p3 = fract(float3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(float2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * vnoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Height of ridge layer fi above the horizon at x. Layers descend from the
// frame edges into a central valley, like the brand watercolor.
float ridgeHeight(float x, float fi) {
  float depth = fi / 3.0;
  float seed = fi * 19.7 + 3.1;
  // Each layer's valley dips at a slightly different point off-center.
  float valleyCenter = 0.5 + (hash(float2(fi, 7.0)) - 0.5) * 0.2;
  float edge = pow(smoothstep(0.02, 0.55, abs(x - valleyCenter)), 1.15);
  // Far layers keep height near the center (they sit deeper in the valley);
  // near layers flatten to the waterline and rise steeply at the frame edges.
  float base = mix(0.12, 0.015, depth);
  float edgeAmp = mix(0.10, 0.48, depth * depth);
  float n = fbm(float2(x * mix(2.8, 6.0, depth) + seed, seed)) - 0.5;
  return base + edge * edgeAmp + n * mix(0.10, 0.22, depth) * (0.45 + 0.55 * edge);
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / uResolution;
  float aspect = uResolution.x / uResolution.y;
  float t = uTime * uMotion;

  // The horizon light breathes on a ~9s cycle — felt, not seen.
  float breath = 0.5 + 0.5 * sin(t * 0.7);
  float2 p = float2((uv.x - 0.5) * aspect, uv.y - uHorizon);

  // Sky
  float3 col = mix(uSkyTop, uSkyHorizon, smoothstep(0.0, uHorizon * 1.08, uv.y));
  float glowDist = length(p * float2(1.0, 1.7));
  float glow = exp(-glowDist * glowDist * 6.0) + exp(-glowDist * 2.8) * 0.4;
  col = mix(col, uGlow, clamp(glow * uGlowStrength * (0.86 + 0.14 * breath), 0.0, 1.0));

  // One shared drifting mist field, reused by every ridge layer.
  float mist = fbm(float2(p.x * 1.7 + t * 0.022, uv.y * 2.4 + t * 0.007));

  if (uv.y <= uHorizon) {
    // Ridges, far to near. Silhouettes are static; only their fog changes.
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float depth = fi / 3.0;
      float top = uHorizon - ridgeHeight(uv.x, fi);
      float soft = mix(0.014, 0.005, depth);
      float m = smoothstep(top - soft, top + soft, uv.y);
      float3 ridge = mix(uRidgeFar, uRidgeNear, depth);
      float fog = (1.0 - depth) * 0.62 + mist * uMistAmount * (1.0 - depth * 0.55);
      ridge = mix(ridge, uMistColor, clamp(fog, 0.0, 0.9));
      col = mix(col, ridge, m);
    }
  } else {
    // Water: mirrored ridge reflections, a shimmering light path, still depth.
    float wy = (uv.y - uHorizon) / max(1.0 - uHorizon, 0.001);
    float3 water = mix(uSkyHorizon, uWater, smoothstep(0.0, 0.9, wy));

    float wobble = (vnoise(float2(uv.x * 7.0, uv.y * 46.0 - t * 0.06)) - 0.5) * 0.02;
    for (int i = 2; i < 4; i++) {
      float fi = float(i);
      float depth = fi / 3.0;
      float top = ridgeHeight(uv.x + wobble, fi);
      float reflected = 1.0 - smoothstep(top - 0.02, top + 0.02, wy * 1.2);
      float3 ridge = mix(mix(uRidgeFar, uRidgeNear, depth * depth), uMistColor, 0.35);
      water = mix(water, ridge, reflected * 0.34);
    }

    float streak = exp(-p.x * p.x * 24.0) * exp(-wy * 2.4);
    float shimmer = 0.72 + 0.28 * vnoise(float2(uv.x * 26.0, uv.y * 80.0 - t * 0.30));
    water = mix(water, uGlow, clamp(streak * shimmer * uGlowStrength * (0.78 + 0.22 * breath), 0.0, 1.0));
    water *= 1.0 + 0.005 * sin(uv.y * 120.0 + vnoise(float2(uv.x * 5.0, t * 0.12)) * 6.0);
    col = water;
  }

  // Static paper grain, in keeping with the watercolor originals.
  col += (hash(fragCoord) - 0.5) * 0.02;

  float2 v = uv * 2.0 - 1.0;
  col *= 1.0 - dot(v, v) * 0.055;

  return half4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const LANDSCAPE_EFFECT = Skia.RuntimeEffect.Make(LANDSCAPE_SKSL);

type LandscapePalette = {
  skyTop: Vec3;
  skyHorizon: Vec3;
  glow: Vec3;
  glowStrength: number;
  ridgeFar: Vec3;
  ridgeNear: Vec3;
  mistColor: Vec3;
  mistAmount: number;
  water: Vec3;
};

// Scene palettes derived from the Moss brand primitives (docs/design/BRAND.md).
// Light: morning mist over the lake. Dark: a warm ink night with a moon path.
const LIGHT_PALETTE: LandscapePalette = {
  skyTop: hexToVec3("#f8f5ee"),
  skyHorizon: hexToVec3("#efe8d9"),
  glow: hexToVec3("#fffdf2"),
  glowStrength: 0.6,
  ridgeFar: hexToVec3("#dcd5c5"),
  ridgeNear: hexToVec3("#9c9884"),
  mistColor: hexToVec3("#f1ede2"),
  mistAmount: 0.38,
  water: hexToVec3("#e3dccb"),
};

const DARK_PALETTE: LandscapePalette = {
  skyTop: hexToVec3("#1b2022"),
  skyHorizon: hexToVec3("#31372f"),
  glow: hexToVec3("#d9d0b5"),
  glowStrength: 0.42,
  ridgeFar: hexToVec3("#2b312c"),
  ridgeNear: hexToVec3("#131617"),
  mistColor: hexToVec3("#3d453e"),
  mistAmount: 0.46,
  water: hexToVec3("#15191b"),
};

// Soft, misty content survives aggressive undersampling: the canvas renders at
// this fraction of its layout size and is scaled back up by the wrapper view.
const RESOLUTION_SCALE = 0.6;
const CLOCK_FPS = 30;
// A frozen clock still shows a composed mid-drift frame for reduced motion.
const STILL_FRAME_SECONDS = 47;

type LivingLandscapeProps = {
  height?: number;
  className?: string;
  /** "bottom" anchors the lake low in the frame; "center" raises the horizon. */
  contentPosition?: "center" | "bottom";
};

export function LivingLandscape({ height = 260, className, contentPosition = "bottom" }: LivingLandscapeProps) {
  const { theme } = useUniwind();
  const { reducedMotion } = useMeditation();
  const width = useSharedValue(1);
  const measuredHeight = useSharedValue(height);
  const time = useShaderClock({
    fps: CLOCK_FPS,
    enabled: !reducedMotion,
    startAt: STILL_FRAME_SECONDS,
  });

  const palette = theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
  const horizon = contentPosition === "bottom" ? 0.52 : 0.6;
  const motion = reducedMotion ? 0 : 1;

  const uniforms = useDerivedValue(() => {
    return {
      uResolution: [
        Math.max(1, Math.round(width.value * RESOLUTION_SCALE)),
        Math.max(1, Math.round(measuredHeight.value * RESOLUTION_SCALE)),
      ],
      uTime: time.value,
      uHorizon: horizon,
      uMotion: motion,
      uSkyTop: palette.skyTop,
      uSkyHorizon: palette.skyHorizon,
      uGlow: palette.glow,
      uGlowStrength: palette.glowStrength,
      uRidgeFar: palette.ridgeFar,
      uRidgeNear: palette.ridgeNear,
      uMistColor: palette.mistColor,
      uMistAmount: palette.mistAmount,
      uWater: palette.water,
    };
  }, [width, measuredHeight, time, horizon, motion, palette]);

  const canvasStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: Math.max(1, Math.round(width.value * RESOLUTION_SCALE)),
    height: Math.max(1, Math.round(measuredHeight.value * RESOLUTION_SCALE)),
    transform: [{ scale: 1 / RESOLUTION_SCALE }],
    transformOrigin: "left top",
  }));

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      width.set(Math.max(1, event.nativeEvent.layout.width));
      measuredHeight.set(Math.max(1, event.nativeEvent.layout.height));
    },
    [width, measuredHeight],
  );

  const fallback = useMemo(
    () => ({ backgroundColor: theme === "dark" ? "#22282a" : "#efe8d9" }),
    [theme],
  );

  if (!LANDSCAPE_EFFECT) {
    return <View className={cn("overflow-hidden", className)} style={[{ height }, fallback]} />;
  }

  return (
    <View
      className={cn("overflow-hidden", className)}
      style={{ height }}
      onLayout={onLayout}
      accessibilityIgnoresInvertColors
    >
      <Animated.View style={canvasStyle}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={LANDSCAPE_EFFECT} uniforms={uniforms} />
          </Fill>
        </Canvas>
      </Animated.View>
    </View>
  );
}
