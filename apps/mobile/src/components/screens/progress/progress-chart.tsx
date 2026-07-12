import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { Typography } from "@/components/ui/typography";
import { ZenCard } from "@/components/ui/zen/zen-card";
import { ZenIcon } from "@/components/ui/zen/zen-icon";
import type { ProgressBucket, ProgressMode } from "@/domain/progress";
import { useThemeColors } from "@/hooks/use-theme-colors";

const DEFAULT_PLOT_WIDTH = 276;
const PLOT_HEIGHT = 212;
const PLOT_PADDING = 7;

function chartScaleMax(buckets: ProgressBucket[]) {
  const peak = Math.max(...buckets.map((bucket) => bucket.minutes), 0);
  const step = Math.max(10, Math.ceil(peak / 15) * 5);
  return step * 3;
}

function chartAccessibilityLabel(buckets: ProgressBucket[], mode: ProgressMode) {
  const period = mode === "week" ? "this week" : "this month";
  const values = buckets
    .map((bucket) => `${bucket.label}, ${bucket.minutes} ${bucket.minutes === 1 ? "minute" : "minutes"}`)
    .join("; ");
  return `Minutes ${period}. ${values}`;
}

type ProgressChartProps = {
  buckets: ProgressBucket[];
  mode: ProgressMode;
  onOpenHistory(): void;
};

export function ProgressChart({ buckets, mode, onOpenHistory }: ProgressChartProps) {
  const colors = useThemeColors();
  const [plotWidth, setPlotWidth] = useState(DEFAULT_PLOT_WIDTH);
  const scaleMax = chartScaleMax(buckets);
  const scaleStep = scaleMax / 3;
  const ticks = [scaleMax, scaleStep * 2, scaleStep, 0];
  const drawableWidth = Math.max(plotWidth - PLOT_PADDING * 2, 1);
  const drawableHeight = PLOT_HEIGHT - PLOT_PADDING * 2;
  const points = buckets.map((bucket, index) => ({
    x: buckets.length === 1 ? plotWidth / 2 : PLOT_PADDING + (index / Math.max(buckets.length - 1, 1)) * drawableWidth,
    y: PLOT_PADDING + (1 - bucket.minutes / scaleMax) * drawableHeight,
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <Pressable
      accessibilityLabel={chartAccessibilityLabel(buckets, mode)}
      accessibilityHint="Opens practice history"
      accessibilityRole="button"
      className="rounded-[20px]"
      onPress={onOpenHistory}
    >
      <ZenCard className="gap-4 p-4">
        <View className="flex-row items-center justify-between gap-3">
          <Typography variant="smallBold">Minutes this {mode}</Typography>
          <View className="flex-row items-center gap-1">
            <Typography variant="label" tone="muted">
              History
            </Typography>
            <ZenIcon name="forward" size={14} tintColor={colors.muted} />
          </View>
        </View>

        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View className="flex-row gap-2">
            <View className="w-7 justify-between" style={{ height: PLOT_HEIGHT }}>
              {ticks.map((tick) => (
                <Typography key={tick} variant="caption" tone="muted" align="right" tabularNums>
                  {tick}
                </Typography>
              ))}
            </View>
            <View className="flex-1">
              <View
                onLayout={({ nativeEvent }) => setPlotWidth(nativeEvent.layout.width)}
                style={{ height: PLOT_HEIGHT }}
              >
                <Svg height={PLOT_HEIGHT} width={plotWidth}>
                  {ticks.map((_, index) => {
                    const y = PLOT_PADDING + (index / (ticks.length - 1)) * drawableHeight;
                    return (
                      <Line
                        key={index}
                        x1={PLOT_PADDING}
                        x2={plotWidth - PLOT_PADDING}
                        y1={y}
                        y2={y}
                        stroke={colors.border}
                        strokeWidth={1}
                      />
                    );
                  })}
                  <Path
                    d={path}
                    fill="none"
                    stroke={colors.accent}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  {points.map((point, index) => (
                    <Circle key={buckets[index].dateKey} cx={point.x} cy={point.y} r={3.5} fill={colors.accent} />
                  ))}
                </Svg>
              </View>
              <View className="flex-row justify-between px-1 pt-2">
                {buckets.map((bucket) => (
                  <Typography key={bucket.dateKey} variant="caption" tone="muted" align="center" tabularNums>
                    {bucket.label}
                  </Typography>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ZenCard>
    </Pressable>
  );
}
