import { useState } from "react";

import {
  QuietHoursControl,
  ReminderTimeControls,
  SettingsToggleCard,
} from "@/components/screens/settings/settings-controls";
import {
  SettingsFeedback,
  SettingsFormLayout,
  SettingsLoading,
  SettingsSection,
  type SettingsFeedbackState,
} from "@/components/screens/settings/settings-layout";
import { NotificationPreview } from "@/components/ui/moss/notification-preview";
import type { AppPreferences } from "@/domain/meditation";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useMeditation } from "@/providers/meditation-provider";

export function RemindersScreen() {
  const meditation = useMeditation();

  if (!meditation.isReady) {
    return <SettingsLoading title="Reminders" />;
  }

  return <RemindersEditor />;
}

function RemindersEditor() {
  const { error, notificationPermission, preferences, saveReminderPreferences } = useMeditation();
  const [draft, setDraft] = useState<AppPreferences>(preferences);
  const saveAction = useAsyncAction();
  const [feedback, setFeedback] = useState<SettingsFeedbackState>(null);

  const save = async () => {
    await saveAction.run(async () => {
      setFeedback(null);
      const wantedReminders = draft.remindersEnabled;
      const result = await saveReminderPreferences(draft, {
        requestPermission: wantedReminders && notificationPermission === "undetermined",
      });
      setDraft(result.preferences);

      if (result.status === "sync-failed") {
        setFeedback({
          message: "Your choices are saved, but reminders couldn’t be updated. Please try again.",
          tone: "danger",
        });
        return;
      }

      if (!wantedReminders) {
        setFeedback({ message: "Reminders are off. Your timing choices are saved.", tone: "success" });
      } else if (result.status === "permission-denied") {
        setFeedback({
          message:
            "Reminders remain off. Your timing choices are saved, and you can allow notifications in device settings whenever you want.",
          tone: "muted",
        });
      } else if (result.status === "no-scheduled-times") {
        setFeedback({
          message: "Your choices are saved. No reminders currently fall outside quiet hours.",
          tone: "muted",
        });
      } else {
        setFeedback({ message: "Reminder settings saved.", tone: "success" });
      }
    });
  };

  const visibleFeedback =
    (saveAction.error
      ? { message: "Your reminder settings couldn’t be saved. Please try again.", tone: "danger" as const }
      : feedback) ??
    (error ? { message: "Your local settings are unavailable right now.", tone: "danger" as const } : null);

  return (
    <SettingsFormLayout
      title="Reminders"
      isSaving={saveAction.isPending}
      onSave={() => void save()}
      feedback={
        visibleFeedback ? (
          <SettingsFeedback tone={visibleFeedback.tone}>{visibleFeedback.message}</SettingsFeedback>
        ) : null
      }
    >
      <SettingsToggleCard
        enabled={draft.remindersEnabled}
        icon="bell"
        label="Reminders"
        onChange={(remindersEnabled) => setDraft((current) => ({ ...current, remindersEnabled }))}
        value="Gentle and optional"
      />

      {notificationPermission === "denied" && draft.remindersEnabled ? (
        <SettingsFeedback>
          Notifications are off in device settings. Moss will stay quiet until you choose to allow them.
        </SettingsFeedback>
      ) : null}

      <SettingsSection title="Reminder timing" description="Choose how early each planned pause should arrive.">
        <ReminderTimeControls
          enabled={draft.remindersEnabled}
          times={draft.practiceTimes}
          onChange={(practiceTimes) => setDraft((current) => ({ ...current, practiceTimes }))}
        />
      </SettingsSection>

      <SettingsSection title="Quiet hours" description="No practice reminders arrive during this window.">
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
