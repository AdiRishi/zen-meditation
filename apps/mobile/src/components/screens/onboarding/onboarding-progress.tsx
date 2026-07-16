import { View } from "react-native";
import Animated from "react-native-reanimated";

import { Typography } from "@/components/ui/typography";
import { crossfadeIn } from "@/lib/motion";

const TOTAL_SETUP_STEPS = 3;

type OnboardingProgressProps = {
  step: 1 | 2 | 3;
};

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  const stepLabel = `Step ${step} of ${TOTAL_SETUP_STEPS}`;

  return (
    <View
      accessible
      accessibilityLabel="Onboarding progress"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: TOTAL_SETUP_STEPS, now: step, text: stepLabel }}
      className="gap-2"
    >
      <Typography variant="small" tone="muted" tabularNums>
        {stepLabel}
      </Typography>
      <View className="flex-row gap-2">
        {Array.from({ length: TOTAL_SETUP_STEPS }, (_, index) => (
          <View key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-separator">
            {index < step ? (
              <Animated.View
                entering={index === step - 1 ? crossfadeIn : undefined}
                className="h-full w-full rounded-full bg-accent"
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
