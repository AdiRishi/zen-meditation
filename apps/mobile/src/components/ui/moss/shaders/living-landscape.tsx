import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { useUniwind } from "uniwind";

import { cn } from "@/lib/cn";
import { useMeditation } from "@/providers/meditation-provider";

import { hexToVec3, lerp, lerpVec3, type Vec3 } from "./color";
import { useShaderClock } from "./use-shader-clock";

/**
 * A procedural rendition of the Moss mountain-lake artwork that follows the
 * real clock like a quiet sundial. The silhouettes never move; the light does:
 * the sun rises on the left, arcs high at midday, and sets on the right — and
 * the light path on the water follows it. The light theme lives through the
 * sun's day; the dark theme lives through the night sky, moonrise to pre-dawn.
 */
const LANDSCAPE_SKSL = `
uniform float2 uResolution;
uniform float  uTime;
uniform float  uHorizon;
uniform float3 uSkyTop;
uniform float3 uSkyHorizon;
uniform float3 uGlow;
uniform float  uGlowStrength;
uniform float2 uLightPos;
uniform float  uDisc;
uniform float  uStars;
uniform float3 uRidgeFar;
uniform float3 uRidgeNear;
uniform float3 uMistColor;
uniform float  uMistAmount;
uniform float3 uWater;
uniform float  uFadeTop;
uniform float  uFadeBottom;

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

// Three octaves are indistinguishable from four on soft fog, and the fog
// terms run once per ridge layer per pixel — the cheapest place to save.
float fbm3(float2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
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
  float valleyCenter = 0.5 + (hash(float2(fi, 7.0)) - 0.5) * 0.2;
  float edge = pow(smoothstep(0.02, 0.55, abs(x - valleyCenter)), 1.15);
  float base = mix(0.12, 0.015, depth);
  float edgeAmp = mix(0.10, 0.48, depth * depth);
  float n = fbm(float2(x * mix(2.8, 6.0, depth) + seed, seed)) - 0.5;
  return base + edge * edgeAmp + n * mix(0.10, 0.22, depth) * (0.45 + 0.55 * edge);
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / uResolution;
  float aspect = uResolution.x / uResolution.y;
  float t = uTime;

  // The light breathes on a ~9s cycle — felt, not seen.
  float breath = 0.5 + 0.5 * sin(t * 0.7);
  float2 p = float2((uv.x - 0.5) * aspect, uv.y - uHorizon);

  // Sky
  float3 col = mix(uSkyTop, uSkyHorizon, smoothstep(0.0, uHorizon * 1.08, uv.y));

  // The sun or moon: a positioned glow with a soft disc at its heart,
  // plus a faint ambient band along the horizon.
  float2 lightP = float2(uLightPos.x, -uLightPos.y);
  float glowDist = length((p - lightP) * float2(1.0, 1.45));
  float glow = exp(-glowDist * glowDist * 6.5) + exp(-glowDist * 2.7) * 0.42;
  glow += exp(-glowDist * glowDist * 70.0) * uDisc;
  glow += exp(-abs(uv.y - uHorizon) * 7.0) * 0.10;
  col = mix(col, uGlow, clamp(glow * uGlowStrength * (0.82 + 0.18 * breath), 0.0, 1.0));

  // A thin lit veil drifting through the sky, densest near the horizon.
  float veil = smoothstep(0.4, 0.85, fbm3(float2(p.x * 1.1 - t * 0.03, uv.y * 2.6 + t * 0.004)));
  float veilBand = (1.0 - smoothstep(uHorizon * 0.35, uHorizon, uv.y)) * step(uv.y, uHorizon);
  col = mix(col, mix(uMistColor, uGlow, 0.4), veil * veilBand * 0.14);

  // One shared drifting mist field; breath gently thickens and thins it.
  float mist = fbm(float2(p.x * 1.7 + t * 0.045, uv.y * 2.4 + t * 0.007));
  float mistAmount = uMistAmount * (0.88 + 0.24 * breath);

  if (uv.y <= uHorizon) {
    // Stars: sparse, slow, and only where the night sky is dark.
    if (uStars > 0.01) {
      float2 cell = floor(fragCoord / 4.0);
      float h = hash(cell);
      float star = step(0.996, h);
      float2 cellUv = fract(fragCoord / 4.0) - 0.5;
      float shape = 1.0 - smoothstep(0.1, 0.45, length(cellUv));
      float twinkle = 0.55 + 0.45 * sin(t * 0.5 + h * 251.0);
      float high = 1.0 - smoothstep(uHorizon * 0.45, uHorizon * 0.95, uv.y);
      col += star * shape * twinkle * uStars * high * (1.0 - clamp(glow * 1.6, 0.0, 1.0)) * 0.5;
    }

    // Ridges, far to near. Silhouettes are static; only their fog changes.
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float depth = fi / 3.0;
      float seed = fi * 19.7 + 3.1;
      float top = uHorizon - ridgeHeight(uv.x, fi);
      float soft = mix(0.014, 0.005, depth);
      float m = smoothstep(top - soft, top + soft, uv.y);
      float3 ridge = mix(uRidgeFar, uRidgeNear, depth);
      float fog = (1.0 - depth) * 0.62 + mist * mistAmount * (1.0 - depth * 0.55);
      ridge = mix(ridge, uMistColor, clamp(fog, 0.0, 0.9));
      col = mix(col, ridge, m);

      // A bank of mist hugging this ridgeline, crawling through the valley.
      // Nearer banks drift faster: parallax in the atmosphere, not the land.
      float wisp = fbm3(float2(
        uv.x * mix(2.2, 3.6, depth) + seed + t * (0.05 + 0.045 * depth),
        (uv.y - top) * 7.0 + seed
      ));
      float hug = exp(-max(uv.y - top, 0.0) * mix(9.0, 20.0, depth)) * m;
      col = mix(col, uMistColor, smoothstep(0.42, 0.9, wisp) * hug * mistAmount * 1.5);
    }
  } else {
    // Water: mirrored ridge reflections, a light path under the sun or moon,
    // still depth.
    float wy = (uv.y - uHorizon) / max(1.0 - uHorizon, 0.001);
    float3 water = mix(uSkyHorizon, uWater, smoothstep(0.0, 0.9, wy));

    float wobble = (vnoise(float2(uv.x * 6.0 + t * 0.1, uv.y * 42.0 - t * 0.24)) - 0.5) * 0.03;
    for (int i = 2; i < 4; i++) {
      float fi = float(i);
      float depth = fi / 3.0;
      float top = ridgeHeight(uv.x + wobble, fi);
      float reflected = 1.0 - smoothstep(top - 0.02, top + 0.02, wy * 1.2);
      float3 ridge = mix(mix(uRidgeFar, uRidgeNear, depth * depth), uMistColor, 0.35);
      water = mix(water, ridge, reflected * 0.34);
    }

    // The light path follows the sun or moon across the water.
    float sx = p.x - uLightPos.x;
    float streak = exp(-sx * sx * 22.0) * exp(-wy * 2.4);
    float shimmer = 0.6 + 0.4 * vnoise(float2(uv.x * 22.0, uv.y * 70.0 - t * 0.55));
    water = mix(water, uGlow, clamp(streak * shimmer * uGlowStrength * (0.78 + 0.22 * breath), 0.0, 1.0));

    // Light ripples drifting across the whole surface, fading with depth.
    float ripple = vnoise(float2(uv.x * 4.0 + t * 0.12, uv.y * 26.0 - t * 0.3)) - 0.5;
    water += uGlow * ripple * 0.06 * exp(-wy * 2.8) * uGlowStrength;
    water *= 1.0 + 0.005 * sin(uv.y * 120.0 + vnoise(float2(uv.x * 5.0, t * 0.12)) * 6.0);
    col = water;
  }

  // Static paper grain, in keeping with the watercolor originals.
  col += (hash(fragCoord) - 0.5) * 0.02;

  float2 v = uv * 2.0 - 1.0;
  col *= 1.0 - dot(v, v) * 0.055;

  // Dissolve into the page canvas at the requested edges, like fog lifting.
  float alpha = smoothstep(0.0, max(uFadeTop, 0.0001), uv.y)
              * smoothstep(1.0, 1.0 - max(uFadeBottom, 0.0001), uv.y);

  return half4(clamp(col, 0.0, 1.0) * alpha, alpha);
}
`;

const LANDSCAPE_EFFECT = Skia.RuntimeEffect.Make(LANDSCAPE_SKSL);

/**
 * The scene at one moment of the day. skyTop is fixed per theme (it must match
 * the page background so faded edges dissolve); everything else is keyframed
 * over the 24h clock and interpolated.
 */
type Scene = {
  skyHorizon: Vec3;
  glow: Vec3;
  glowStrength: number;
  /** Definition of the sun/moon disc at the glow's heart: 0 = pure haze. */
  disc: number;
  /** Horizontal position in scene units: negative = east (left), positive = west. */
  lightX: number;
  /** Height above the horizon in uv units. */
  lightY: number;
  ridgeFar: Vec3;
  ridgeNear: Vec3;
  mistColor: Vec3;
  mistAmount: number;
  water: Vec3;
  stars: number;
};

type Keyframe = { hour: number; scene: Scene };

const LIGHT_SKY_TOP = hexToVec3("#f8f5ee");
const DARK_SKY_TOP = hexToVec3("#171c18");

// The sun's day. Dawn and golden hour are allowed to be striking;
// midday stays quiet and clear.
const LIGHT_KEYFRAMES: Keyframe[] = [
  {
    hour: 0, // deep twilight (light theme kept on at night)
    scene: {
      skyHorizon: hexToVec3("#e3dac6"),
      glow: hexToVec3("#f2e6c2"),
      glowStrength: 0.3,
      disc: 0,
      lightX: 0,
      lightY: 0.06,
      ridgeFar: hexToVec3("#d5cebd"),
      ridgeNear: hexToVec3("#92907c"),
      mistColor: hexToVec3("#efebde"),
      mistAmount: 0.3,
      water: hexToVec3("#dfd8c5"),
      stars: 0,
    },
  },
  {
    hour: 5.5, // first light in the east
    scene: {
      skyHorizon: hexToVec3("#eddcb8"),
      glow: hexToVec3("#ffe2a8"),
      glowStrength: 0.55,
      disc: 0.25,
      lightX: -0.32,
      lightY: 0.02,
      ridgeFar: hexToVec3("#d8d0bc"),
      ridgeNear: hexToVec3("#8e8b74"),
      mistColor: hexToVec3("#efe8d4"),
      mistAmount: 0.52,
      water: hexToVec3("#e0d8c2"),
      stars: 0,
    },
  },
  {
    hour: 7.5, // dawn: low gold sun, heavy valley mist
    scene: {
      skyHorizon: hexToVec3("#f0dfbb"),
      glow: hexToVec3("#ffe3a4"),
      glowStrength: 0.75,
      disc: 0.5,
      lightX: -0.28,
      lightY: 0.06,
      ridgeFar: hexToVec3("#d8d0bc"),
      ridgeNear: hexToVec3("#87856e"),
      mistColor: hexToVec3("#f0e9d5"),
      mistAmount: 0.5,
      water: hexToVec3("#e4dcc4"),
      stars: 0,
    },
  },
  {
    hour: 10.5, // morning: the misty brand watercolor
    scene: {
      skyHorizon: hexToVec3("#efe8d9"),
      glow: hexToVec3("#fffdf2"),
      glowStrength: 0.6,
      disc: 0.15,
      lightX: -0.14,
      lightY: 0.16,
      ridgeFar: hexToVec3("#dcd5c5"),
      ridgeNear: hexToVec3("#9c9884"),
      mistColor: hexToVec3("#f1ede2"),
      mistAmount: 0.38,
      water: hexToVec3("#e3dccb"),
      stars: 0,
    },
  },
  {
    hour: 13.5, // midday: high light, clear air
    scene: {
      skyHorizon: hexToVec3("#f2ede0"),
      glow: hexToVec3("#fffef6"),
      glowStrength: 0.45,
      disc: 0.08,
      lightX: 0,
      lightY: 0.3,
      ridgeFar: hexToVec3("#ddd7c8"),
      ridgeNear: hexToVec3("#a19d89"),
      mistColor: hexToVec3("#f2eee4"),
      mistAmount: 0.22,
      water: hexToVec3("#e6e0cf"),
      stars: 0,
    },
  },
  {
    hour: 16.5, // afternoon: the light begins to lean west
    scene: {
      skyHorizon: hexToVec3("#f0e5cf"),
      glow: hexToVec3("#fcefc6"),
      glowStrength: 0.6,
      disc: 0.2,
      lightX: 0.16,
      lightY: 0.15,
      ridgeFar: hexToVec3("#d9d0ba"),
      ridgeNear: hexToVec3("#948f78"),
      mistColor: hexToVec3("#f0ead8"),
      mistAmount: 0.3,
      water: hexToVec3("#e3dbc4"),
      stars: 0,
    },
  },
  {
    hour: 19, // golden hour: amber light, dark silhouettes
    scene: {
      skyHorizon: hexToVec3("#eccf9e"),
      glow: hexToVec3("#f8d288"),
      glowStrength: 0.85,
      disc: 0.6,
      lightX: 0.3,
      lightY: 0.05,
      ridgeFar: hexToVec3("#d3c6a8"),
      ridgeNear: hexToVec3("#7a755f"),
      mistColor: hexToVec3("#efe3c8"),
      mistAmount: 0.4,
      water: hexToVec3("#e2d3b2"),
      stars: 0,
    },
  },
  {
    hour: 20.5, // dusk fading toward twilight
    scene: {
      skyHorizon: hexToVec3("#e6d9bd"),
      glow: hexToVec3("#f4dfa6"),
      glowStrength: 0.5,
      disc: 0.2,
      lightX: 0.34,
      lightY: 0.02,
      ridgeFar: hexToVec3("#d5cdba"),
      ridgeNear: hexToVec3("#8a8770"),
      mistColor: hexToVec3("#eee7d2"),
      mistAmount: 0.36,
      water: hexToVec3("#dfd6be"),
      stars: 0,
    },
  },
];

// The night's sky. Users who force dark mode during the day get a neutral
// moonlit scene; evening, deep night, and pre-dawn each have a character.
const DARK_KEYFRAMES: Keyframe[] = [
  {
    hour: 0, // deep night: moon high, stars out
    scene: {
      skyHorizon: hexToVec3("#2a3526"),
      glow: hexToVec3("#dcd3b0"),
      glowStrength: 0.4,
      disc: 0.4,
      lightX: 0.04,
      lightY: 0.2,
      ridgeFar: hexToVec3("#242d20"),
      ridgeNear: hexToVec3("#0e120d"),
      mistColor: hexToVec3("#3b4834"),
      mistAmount: 0.4,
      water: hexToVec3("#10140d"),
      stars: 1,
    },
  },
  {
    hour: 4.5, // pre-dawn: a warm promise low in the east
    scene: {
      skyHorizon: hexToVec3("#33402b"),
      glow: hexToVec3("#e8d8a2"),
      glowStrength: 0.5,
      disc: 0.3,
      lightX: -0.3,
      lightY: 0.03,
      ridgeFar: hexToVec3("#26301f"),
      ridgeNear: hexToVec3("#0e120d"),
      mistColor: hexToVec3("#3f4c37"),
      mistAmount: 0.55,
      water: hexToVec3("#12160f"),
      stars: 0.35,
    },
  },
  {
    hour: 8, // dark theme by day: the neutral moonlit scene
    scene: {
      skyHorizon: hexToVec3("#2f3b2a"),
      glow: hexToVec3("#e5d9ab"),
      glowStrength: 0.46,
      disc: 0.2,
      lightX: -0.05,
      lightY: 0.16,
      ridgeFar: hexToVec3("#273123"),
      ridgeNear: hexToVec3("#0f130e"),
      mistColor: hexToVec3("#3f4c37"),
      mistAmount: 0.46,
      water: hexToVec3("#11150e"),
      stars: 0.12,
    },
  },
  {
    hour: 16, // late afternoon in dark theme, easing toward evening
    scene: {
      skyHorizon: hexToVec3("#2f3b2a"),
      glow: hexToVec3("#e5d9ab"),
      glowStrength: 0.48,
      disc: 0.3,
      lightX: 0.12,
      lightY: 0.12,
      ridgeFar: hexToVec3("#273123"),
      ridgeNear: hexToVec3("#0f130e"),
      mistColor: hexToVec3("#3f4c37"),
      mistAmount: 0.46,
      water: hexToVec3("#11150e"),
      stars: 0.2,
    },
  },
  {
    hour: 17.5, // evening: moonrise and a warm afterglow
    scene: {
      skyHorizon: hexToVec3("#34402c"),
      glow: hexToVec3("#e9dca6"),
      glowStrength: 0.55,
      disc: 0.45,
      lightX: 0.26,
      lightY: 0.06,
      ridgeFar: hexToVec3("#293320"),
      ridgeNear: hexToVec3("#0e120d"),
      mistColor: hexToVec3("#41503a"),
      mistAmount: 0.48,
      water: hexToVec3("#12160f"),
      stars: 0.45,
    },
  },
  {
    hour: 21, // night settling in
    scene: {
      skyHorizon: hexToVec3("#2c3724"),
      glow: hexToVec3("#e0d5ae"),
      glowStrength: 0.46,
      disc: 0.5,
      lightX: 0.15,
      lightY: 0.12,
      ridgeFar: hexToVec3("#252e20"),
      ridgeNear: hexToVec3("#0e120d"),
      mistColor: hexToVec3("#3d4a36"),
      mistAmount: 0.42,
      water: hexToVec3("#11150e"),
      stars: 0.85,
    },
  },
];

function blendScenes(a: Scene, b: Scene, t: number): Scene {
  const eased = t * t * (3 - 2 * t);
  return {
    skyHorizon: lerpVec3(a.skyHorizon, b.skyHorizon, eased),
    glow: lerpVec3(a.glow, b.glow, eased),
    glowStrength: lerp(a.glowStrength, b.glowStrength, eased),
    disc: lerp(a.disc, b.disc, eased),
    lightX: lerp(a.lightX, b.lightX, eased),
    lightY: lerp(a.lightY, b.lightY, eased),
    ridgeFar: lerpVec3(a.ridgeFar, b.ridgeFar, eased),
    ridgeNear: lerpVec3(a.ridgeNear, b.ridgeNear, eased),
    mistColor: lerpVec3(a.mistColor, b.mistColor, eased),
    mistAmount: lerp(a.mistAmount, b.mistAmount, eased),
    water: lerpVec3(a.water, b.water, eased),
    stars: lerp(a.stars, b.stars, eased),
  };
}

function sceneAtHour(keyframes: Keyframe[], hour: number): Scene {
  const wrapped = ((hour % 24) + 24) % 24;
  for (let index = 0; index < keyframes.length; index += 1) {
    const current = keyframes[index];
    const next = keyframes[(index + 1) % keyframes.length];
    const nextHour = index + 1 === keyframes.length ? next.hour + 24 : next.hour;
    if (wrapped >= current.hour && wrapped < nextHour) {
      const span = nextHour - current.hour;
      return blendScenes(current.scene, next.scene, span <= 0 ? 0 : (wrapped - current.hour) / span);
    }
  }
  return keyframes[0].scene;
}

function fractionalHourNow(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

const CLOCK_REFRESH_MS = 5 * 60_000;

function useFractionalHour(override?: number): number {
  const [hour, setHour] = useState(fractionalHourNow);
  useEffect(() => {
    if (override !== undefined) {
      return;
    }
    const interval = setInterval(() => setHour(fractionalHourNow()), CLOCK_REFRESH_MS);
    return () => clearInterval(interval);
  }, [override]);
  return override ?? hour;
}

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
  /** Points over which the scene dissolves into the page at the top edge. */
  fadeTop?: number;
  /** Points over which the scene dissolves into the page at the bottom edge. */
  fadeBottom?: number;
  /** Pin the scene to a fixed hour (0–24) instead of following the clock. */
  hourOverride?: number;
};

export function LivingLandscape({
  height = 260,
  className,
  contentPosition = "bottom",
  fadeTop = 0,
  fadeBottom = 0,
  hourOverride,
}: LivingLandscapeProps) {
  const { theme } = useUniwind();
  const { reducedMotion } = useMeditation();
  // Tab screens stay mounted while other tabs are open: freeze the clock the
  // moment the scene is off-screen, so a hidden landscape costs nothing.
  const isFocused = useIsFocused();
  const width = useSharedValue(1);
  const measuredHeight = useSharedValue(height);
  const time = useShaderClock({
    fps: CLOCK_FPS,
    enabled: !reducedMotion && isFocused,
    startAt: STILL_FRAME_SECONDS,
  });

  const hour = useFractionalHour(hourOverride);
  const isDark = theme === "dark";
  const scene = sceneAtHour(isDark ? DARK_KEYFRAMES : LIGHT_KEYFRAMES, hour);
  const skyTop = isDark ? DARK_SKY_TOP : LIGHT_SKY_TOP;
  const horizon = contentPosition === "bottom" ? 0.52 : 0.6;
  const fadeTopFraction = Math.min(0.45, fadeTop / height);
  const fadeBottomFraction = Math.min(0.45, fadeBottom / height);

  const uniforms = useDerivedValue(() => {
    return {
      uResolution: [
        Math.max(1, Math.round(width.value * RESOLUTION_SCALE)),
        Math.max(1, Math.round(measuredHeight.value * RESOLUTION_SCALE)),
      ],
      uTime: time.value,
      uHorizon: horizon,
      uSkyTop: skyTop,
      uSkyHorizon: scene.skyHorizon,
      uGlow: scene.glow,
      uGlowStrength: scene.glowStrength,
      uLightPos: [scene.lightX, scene.lightY],
      uDisc: scene.disc,
      uStars: scene.stars,
      uRidgeFar: scene.ridgeFar,
      uRidgeNear: scene.ridgeNear,
      uMistColor: scene.mistColor,
      uMistAmount: scene.mistAmount,
      uWater: scene.water,
      uFadeTop: fadeTopFraction,
      uFadeBottom: fadeBottomFraction,
    };
  }, [width, measuredHeight, time, horizon, skyTop, scene, fadeTopFraction, fadeBottomFraction]);

  const canvasStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: Math.max(1, Math.round(width.value * RESOLUTION_SCALE)),
    height: Math.max(1, Math.round(measuredHeight.value * RESOLUTION_SCALE)),
    transform: [{ scale: 1 / RESOLUTION_SCALE }],
    transformOrigin: "left top",
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    width.set(Math.max(1, event.nativeEvent.layout.width));
    measuredHeight.set(Math.max(1, event.nativeEvent.layout.height));
  };

  const fallback = { backgroundColor: theme === "dark" ? "#232b23" : "#efe8d9" };

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
