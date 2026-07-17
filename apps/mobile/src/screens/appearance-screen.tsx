import { useState } from "react";

import { AppearanceChoiceList } from "@/components/screens/settings/settings-controls";
import {
  SettingsFeedback,
  SettingsLoading,
  SettingsScreenLayout,
  SettingsSection,
  type SettingsFeedbackState,
} from "@/components/screens/settings/settings-layout";
import { MossToggleCard } from "@/components/ui/moss/toggle-card";
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
    (error ? { message: "Your settings couldn’t be loaded right now.", tone: "danger" as const } : null);

  return (
    <SettingsScreenLayout title="Appearance">
      <SettingsSection title="Colour theme">
        <AppearanceChoiceList
          disabled={saveAction.isPending}
          value={preferences.appearance}
          onChange={(appearance) => void apply({ ...preferences, appearance })}
        />
      </SettingsSection>

      <SettingsSection title="Motion">
        <MossToggleCard
          disabled={saveAction.isPending}
          enabled={preferences.reducedMotion}
          icon="motion"
          label="Reduced motion"
          onChange={(reducedMotion) => void apply({ ...preferences, reducedMotion })}
          value={
            preferences.reducedMotion
              ? "Uses fades instead of movement"
              : reducedMotion
                ? "On through your device setting"
                : "Following your device setting"
          }
        />
      </SettingsSection>

      {visibleFeedback ? (
        <SettingsFeedback tone={visibleFeedback.tone}>{visibleFeedback.message}</SettingsFeedback>
      ) : null}
    </SettingsScreenLayout>
  );
}
