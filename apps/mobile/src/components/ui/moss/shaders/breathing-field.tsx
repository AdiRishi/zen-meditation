import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useUniwind } from "uniwind";

import { hexToVec3, type Vec3 } from "./color";
import { useShaderClock } from "./use-shader-clock";

type BreathingFieldProps = {
  reducedMotion: boolean;
  ending: boolean;
  size?: number;
};

/**
 * The breathing field: a luminous moss-green orb whose radius expands and
 * contracts on the brand breathing rhythm. The rim is perturbed by slow noise
 * so it reads as ink wash rather than a geometric circle.
 */
const BREATHING_SKSL = `
uniform float2 uResolution;
uniform float  uTime;
uniform float  uBreath;
uniform float  uDim;
uniform float3 uCore;
uniform float3 uField;
uniform float3 uAccent;

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
  for (int i = 0; i < 3; i++) {
    value += amplitude * vnoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

half4 main(float2 fragCoord) {
  float2 uv = (fragCoord * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime;
  float r = length(uv);

  float radius = mix(0.58, 0.74, uBreath) * mix(1.0, 0.74, uDim);

  float2 dir = r > 0.001 ? uv / r : float2(0.0, 1.0);
  float wobble = fbm(dir * 1.6 + float2(t * 0.045, -t * 0.03)) - 0.5;
  float edge = radius * (1.0 + wobble * 0.06);

  float body = 1.0 - smoothstep(edge * 0.6, edge, r);
  float halo = 1.0 - smoothstep(edge * 0.85, edge * 1.4, r);
  if (halo <= 0.0) {
    return half4(0.0);
  }

  // Inner drift: a barely-moving grain of light inside the field.
  float tex = fbm(uv * 2.2 + float2(t * 0.030, -t * 0.022));

  float3 col = mix(uField, uCore, body * (0.5 + 0.5 * exp(-r * r * 4.0)));
  col = mix(col, uAccent, (tex - 0.5) * 0.2 * body);
  col += uCore * exp(-r * r * 7.0) * (0.1 + 0.08 * uBreath);

  float alpha = max(body, halo * 0.45) * mix(0.95, 0.6, uDim);
  return half4(col * alpha, alpha);
}
`;

const BREATHING_EFFECT = Skia.RuntimeEffect.Make(BREATHING_SKSL);

type FieldPalette = { core: Vec3; field: Vec3; accent: Vec3 };

const LIGHT_FIELD: FieldPalette = {
  core: hexToVec3("#eef0da"),
  field: hexToVec3("#b0baa2"),
  accent: hexToVec3("#8a9479"),
};

const DARK_FIELD: FieldPalette = {
  core: hexToVec3("#61704f"),
  field: hexToVec3("#283224"),
  accent: hexToVec3("#a9c08d"),
};

const MAX_FIELD_SIZE = 330;
// Inhale + exhale = 2.8s, inside the brand's 2.4–3.2s breathing loop.
const HALF_BREATH_MS = 1_400;
const RESOLUTION_SCALE = 0.6;

export function BreathingField({ reducedMotion, ending, size }: BreathingFieldProps) {
  const { theme } = useUniwind();
  const { width } = useWindowDimensions();
  const breath = useSharedValue(0.5);
  const dim = useSharedValue(ending ? 1 : 0);
  const time = useShaderClock({ fps: 30, enabled: !reducedMotion, startAt: 23 });
  const fieldSize = size ?? Math.min(MAX_FIELD_SIZE, width - 48);

  useEffect(() => {
    cancelAnimation(breath);
    if (reducedMotion) {
      breath.set(0.5);
      return;
    }
    breath.set(withRepeat(withTiming(1, { duration: HALF_BREATH_MS, easing: Easing.inOut(Easing.ease) }), -1, true));
    return () => cancelAnimation(breath);
  }, [breath, reducedMotion]);

  useEffect(() => {
    dim.set(
      reducedMotion
        ? ending
          ? 1
          : 0
        : withTiming(ending ? 1 : 0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
    );
  }, [dim, ending, reducedMotion]);

  const palette = theme === "dark" ? DARK_FIELD : LIGHT_FIELD;
  const canvasSize = Math.max(1, Math.round(fieldSize * RESOLUTION_SCALE));

  const uniforms = useDerivedValue(() => {
    return {
      uResolution: [canvasSize, canvasSize],
      uTime: time.value,
      uBreath: breath.value,
      uDim: dim.value,
      uCore: palette.core,
      uField: palette.field,
      uAccent: palette.accent,
    };
  }, [canvasSize, time, breath, dim, palette]);

  if (!BREATHING_EFFECT) {
    return <View style={{ height: fieldSize, width: fieldSize }} />;
  }

  return (
    <View style={{ height: fieldSize, width: fieldSize }} accessibilityElementsHidden accessibilityIgnoresInvertColors>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: canvasSize,
          height: canvasSize,
          transform: [{ scale: 1 / RESOLUTION_SCALE }],
          transformOrigin: "left top",
        }}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={BREATHING_EFFECT} uniforms={uniforms} />
          </Fill>
        </Canvas>
      </View>
    </View>
  );
}
