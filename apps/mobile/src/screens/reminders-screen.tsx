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
} from "@/components/screens/settings/settings-layout";
import { NotificationPreview } from "@/components/ui/zen/notification-preview";
import type { AppPreferences } from "@/domain/meditation";
import { useMeditation } from "@/providers/meditation-provider";

type SaveFeedback = { message: string; tone: "muted" | "success" | "danger" } | null;

export function RemindersScreen() {
  const meditation = useMeditation();

  if (!meditation.isReady) {
    return <SettingsLoading title="Reminders" />;
  }

  return (
    <RemindersEditor
      error={meditation.error}
      notificationPermission={meditation.notificationPermission}
      preferences={meditation.preferences}
      saveReminderPreferences={meditation.saveReminderPreferences}
    />
  );
}

type RemindersEditorProps = Pick<
  ReturnType<typeof useMeditation>,
  "error" | "notificationPermission" | "preferences" | "saveReminderPreferences"
>;

function RemindersEditor({
  error,
  notificationPermission,
  preferences,
  saveReminderPreferences,
}: RemindersEditorProps) {
  const [draft, setDraft] = useState<AppPreferences>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<SaveFeedback>(null);

  const save = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
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
    } catch {
      setFeedback({ message: "Your reminder settings couldn’t be saved. Please try again.", tone: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const visibleFeedback =
    feedback ?? (error ? { message: "Your local settings are unavailable right now.", tone: "danger" as const } : null);

  return (
    <SettingsFormLayout
      title="Reminders"
      isSaving={isSaving}
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
          Notifications are off in device settings. Zen will stay quiet until you choose to allow them.
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
