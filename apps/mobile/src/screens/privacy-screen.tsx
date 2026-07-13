import { useRouter } from "expo-router";
import { useState } from "react";

import { PrivacySummary, ResetLocalDataButton } from "@/components/screens/settings/privacy-panel";
import { SettingsFeedback, SettingsScreenLayout, SettingsSection } from "@/components/screens/settings/settings-layout";
import { confirmLocalDataReset } from "@/lib/confirm-local-data-reset";
import { useMeditation } from "@/providers/meditation-provider";

type ResetFeedback = { message: string; tone: "success" | "danger" } | null;

export function PrivacyScreen() {
  const router = useRouter();
  const { resetAllData } = useMeditation();
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<ResetFeedback>(null);

  const reset = async () => {
    setIsResetting(true);
    setFeedback(null);
    try {
      await resetAllData();
      setFeedback({ message: "Local data has been reset.", tone: "success" });
      router.replace("/");
    } catch {
      setFeedback({ message: "Your local data couldn’t be reset. Please try again.", tone: "danger" });
    } finally {
      setIsResetting(false);
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
        <ResetLocalDataButton disabled={isResetting} onPress={confirmReset} />
      </SettingsSection>

      {feedback ? <SettingsFeedback tone={feedback.tone}>{feedback.message}</SettingsFeedback> : null}
    </SettingsScreenLayout>
  );
}
