import { useState } from "react";

import { AppearanceChoiceList, SettingsToggleCard } from "@/components/screens/settings/settings-controls";
import {
  SettingsFeedback,
  SettingsLoading,
  SettingsScreenLayout,
  SettingsSection,
  type SettingsFeedbackState,
} from "@/components/screens/settings/settings-layout";
import type { AppPreferences } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useMeditation } from "@/providers/meditation-provider";

export function AppearanceScreen() {
  const { error, isReady, preferences, reducedMotion, savePreferences } = useMeditation();
  const saveAction = useAsyncAction();
  const [feedback, setFeedback] = useState<SettingsFeedbackState>(null);

  if (!isReady) {
    return <SettingsLoading title="Appearance" />;
  }

  const apply = async (next: AppPreferences) => {
    const saved = await saveAction.run(async () => {
      setFeedback(null);
      await savePreferences(next);
    });
    if (saved) {
      setFeedback({ message: "Appearance saved.", tone: "success" });
    }
  };

  const visibleFeedback =
    (saveAction.error
      ? { message: "Your appearance setting couldn’t be saved. Please try again.", tone: "danger" as const }
      : feedback) ??
    (error ? { message: "Your local settings are unavailable right now.", tone: "danger" as const } : null);

  return (
    <SettingsScreenLayout title="Appearance">
      <SettingsSection title="Colour theme" description="System follows the appearance chosen for your device.">
        <AppearanceChoiceList
          disabled={saveAction.isPending}
          value={preferences.appearance}
          onChange={(appearance) => void apply({ ...preferences, appearance })}
        />
      </SettingsSection>

      <SettingsSection
        title="Motion"
        description="Respects system settings. Moss replaces movement with quieter fades."
      >
        <SettingsToggleCard
          disabled={saveAction.isPending}
          enabled={preferences.reducedMotion}
          icon="motion"
          label="Reduced motion"
          onChange={(reducedMotion) => void apply({ ...preferences, reducedMotion })}
          value={
            preferences.reducedMotion
              ? "Always use quieter transitions"
              : reducedMotion
                ? "On through your system setting"
                : "Follows your system setting"
          }
        />
      </SettingsSection>

      {visibleFeedback ? (
        <SettingsFeedback tone={visibleFeedback.tone}>{visibleFeedback.message}</SettingsFeedback>
      ) : null}
    </SettingsScreenLayout>
  );
}
