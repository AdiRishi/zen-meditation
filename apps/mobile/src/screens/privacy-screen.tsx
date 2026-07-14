import { useRouter } from "expo-router";
import { useState } from "react";

import { PrivacySummary, ResetLocalDataButton } from "@/components/screens/settings/privacy-panel";
import {
  SettingsFeedback,
  SettingsScreenLayout,
  SettingsSection,
  type SettingsFeedbackState,
} from "@/components/screens/settings/settings-layout";
import { useAsyncAction } from "@/hooks/use-async-action";
import { confirmLocalDataReset } from "@/lib/confirm-local-data-reset";
import { useMeditation } from "@/providers/meditation-provider";

export function PrivacyScreen() {
  const router = useRouter();
  const { resetAllData } = useMeditation();
  const resetAction = useAsyncAction();
  const [feedback, setFeedback] = useState<SettingsFeedbackState>(null);

  const reset = async () => {
    const resetSucceeded = await resetAction.run(async () => {
      setFeedback(null);
      await resetAllData();
    });
    if (resetSucceeded) {
      setFeedback({ message: "Local data has been reset.", tone: "success" });
      router.replace("/");
    }
  };

  const confirmReset = () => {
    confirmLocalDataReset(() => void reset());
  };

  return (
    <SettingsScreenLayout title="Privacy">
      <SettingsSection title="Privacy by design" description="No accounts. No tracking.">
        <PrivacySummary />
      </SettingsSection>

      <SettingsSection
        title="Reset Zen"
        description="Remove your practice history and restore every preference to its original setting."
      >
        <ResetLocalDataButton disabled={resetAction.isPending} onPress={confirmReset} />
      </SettingsSection>

      {resetAction.error ? (
        <SettingsFeedback tone="danger">Your local data couldn’t be reset. Please try again.</SettingsFeedback>
      ) : feedback ? (
        <SettingsFeedback tone={feedback.tone}>{feedback.message}</SettingsFeedback>
      ) : null}
    </SettingsScreenLayout>
  );
}
