import { useState } from "react";
import { Linking, View } from "react-native";

import { QuietHoursControl, ReminderTimeControls } from "@/components/screens/settings/settings-controls";
import {
  SettingsFeedback,
  SettingsFormLayout,
  SettingsLoading,
  SettingsSection,
  type SettingsFeedbackState,
} from "@/components/screens/settings/settings-layout";
import { MossSecondaryButton } from "@/components/ui/moss/moss-button";
import { NotificationPreview } from "@/components/ui/moss/notification-preview";
import { MossToggleCard } from "@/components/ui/moss/toggle-card";
import type { AppPreferences } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useMeditation } from "@/providers/meditation-provider";

export function RemindersScreen() {
  const meditation = useMeditation();

  if (!meditation.isReady) {
    return <SettingsLoading title="Notifications" />;
  }

  return <RemindersEditor />;
}

function RemindersEditor() {
  const { error, notificationPermission, preferences, saveNotificationPreferences } = useMeditation();
  const [draft, setDraft] = useState<AppPreferences>(preferences);
  const saveAction = useAsyncAction();
  const [feedback, setFeedback] = useState<SettingsFeedbackState>(null);

  const openDeviceSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      setFeedback({ message: "Device settings couldn’t be opened. Please try again.", tone: "danger" });
    }
  };

  const save = async () => {
    await saveAction.run(async () => {
      setFeedback(null);
      const notificationsRequested = draft.backgroundCompletionAlertsEnabled || draft.remindersEnabled;
      const result = await saveNotificationPreferences(draft, {
        requestPermission:
          notificationsRequested && notificationPermission.status !== "granted" && notificationPermission.canAskAgain,
      });
      setDraft(result.preferences);

      if (result.status === "sync-failed") {
        setFeedback({
          message: "Your choices are saved, but notifications couldn’t be updated. Try saving again.",
          tone: "danger",
        });
        return;
      }

      if (result.status === "disabled") {
        setFeedback({ message: "Saved. Notifications are turned off.", tone: "success" });
      } else if (result.status === "permission-denied") {
        setFeedback({
          message: "Saved. To get notifications, allow them for Moss in your device settings.",
          tone: "muted",
        });
      } else if (result.status === "sound-disabled") {
        setFeedback({
          message: "Saved. Notification sounds are off in your device settings, so session endings will be silent.",
          tone: "muted",
        });
      } else if (result.status === "no-scheduled-times") {
        setFeedback({
          message: "Saved. All of your reminders currently fall within quiet hours, so none are scheduled.",
          tone: "muted",
        });
      } else {
        setFeedback({ message: "Notification settings saved.", tone: "success" });
      }
    });
  };

  const visibleFeedback =
    (saveAction.error
      ? { message: "Your notification settings couldn’t be saved. Please try again.", tone: "danger" as const }
      : feedback) ??
    (error ? { message: "Your settings couldn’t be loaded right now.", tone: "danger" as const } : null);

  return (
    <SettingsFormLayout
      title="Notifications"
      isSaving={saveAction.isPending}
      onSave={() => void save()}
      feedback={
        visibleFeedback ? (
          <SettingsFeedback tone={visibleFeedback.tone}>{visibleFeedback.message}</SettingsFeedback>
        ) : null
      }
    >
      <SettingsSection title="Session completion">
        <MossToggleCard
          enabled={draft.backgroundCompletionAlertsEnabled}
          icon="sound"
          label="Background completion sound"
          onChange={(backgroundCompletionAlertsEnabled) =>
            setDraft((current) => ({ ...current, backgroundCompletionAlertsEnabled }))
          }
          value="Plays your completion sound when Moss is in the background"
        />
      </SettingsSection>

      <SettingsSection title="Practice reminders">
        <MossToggleCard
          enabled={draft.remindersEnabled}
          icon="bell"
          label="Practice reminders"
          onChange={(remindersEnabled) => setDraft((current) => ({ ...current, remindersEnabled }))}
          value="A notification before each practice time"
        />
      </SettingsSection>

      {notificationPermission.status !== "granted" &&
      (draft.backgroundCompletionAlertsEnabled || draft.remindersEnabled) ? (
        <View className="gap-3">
          <SettingsFeedback>
            Notifications are off in your device settings. Your choices here will apply once you allow them.
          </SettingsFeedback>
          {notificationPermission.canAskAgain ? null : (
            <MossSecondaryButton onPress={() => void openDeviceSettings()}>Open device settings</MossSecondaryButton>
          )}
        </View>
      ) : null}

      {notificationPermission.status === "granted" &&
      !notificationPermission.allowsSound &&
      draft.backgroundCompletionAlertsEnabled ? (
        <View className="gap-3">
          <SettingsFeedback>
            Notification sounds are off in your device settings, so session endings will be silent.
          </SettingsFeedback>
          <MossSecondaryButton onPress={() => void openDeviceSettings()}>Open device settings</MossSecondaryButton>
        </View>
      ) : null}

      <SettingsSection title="Reminder timing" description="How long before each practice time the reminder arrives.">
        <ReminderTimeControls
          enabled={draft.remindersEnabled}
          times={draft.practiceTimes}
          onChange={(practiceTimes) => setDraft((current) => ({ ...current, practiceTimes }))}
        />
      </SettingsSection>

      <SettingsSection title="Quiet hours" description="Reminders won’t arrive between these times.">
        <QuietHoursControl
          enabled={draft.remindersEnabled}
          startMinute={draft.quietHours.startMinute}
          endMinute={draft.quietHours.endMinute}
          onChange={(quietHours) => setDraft((current) => ({ ...current, quietHours }))}
        />
      </SettingsSection>

      <SettingsSection title="Preview">
        <NotificationPreview />
      </SettingsSection>
    </SettingsFormLayout>
  );
}
