import { View } from "react-native";

import { Typography } from "@/components/ui/typography";

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
          <View key={index} className={`h-1 flex-1 rounded-full ${index < step ? "bg-accent" : "bg-separator"}`} />
        ))}
      </View>
    </View>
  );
}
