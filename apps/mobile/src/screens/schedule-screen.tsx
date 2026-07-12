import { useState } from "react";

import {
  AddPracticeTimeButton,
  PracticeTimeControls,
  SessionsPerDayControl,
} from "@/components/screens/settings/settings-controls";
import {
  SettingsFeedback,
  SettingsFormLayout,
  SettingsLoading,
  SettingsSection,
} from "@/components/screens/settings/settings-layout";
import { WeekdaySelector } from "@/components/ui/zen/weekday-selector";
import { createPracticeTimeId, MAX_PRACTICE_TIMES, type AppPreferences } from "@/domain/meditation";
import { useMeditation } from "@/providers/meditation-provider";

type SaveFeedback = { message: string; tone: "muted" | "success" | "danger" } | null;

export function ScheduleScreen() {
  const meditation = useMeditation();

  if (!meditation.isReady) {
    return <SettingsLoading title="Schedule" />;
  }

  return (
    <ScheduleEditor
      error={meditation.error}
      preferences={meditation.preferences}
      rescheduleReminders={meditation.rescheduleReminders}
      savePreferences={meditation.savePreferences}
    />
  );
}

type ScheduleEditorProps = Pick<
  ReturnType<typeof useMeditation>,
  "error" | "preferences" | "rescheduleReminders" | "savePreferences"
>;

function ScheduleEditor({ error, preferences, rescheduleReminders, savePreferences }: ScheduleEditorProps) {
  const [draft, setDraft] = useState<AppPreferences>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<SaveFeedback>(null);

  const save = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await savePreferences(draft);
      try {
        await rescheduleReminders(draft);
      } catch {
        setFeedback({
          message: "Schedule saved. Reminders couldn’t be updated, so please save once more.",
          tone: "muted",
        });
        return;
      }
      setFeedback({ message: "Schedule saved.", tone: "success" });
    } catch {
      setFeedback({ message: "Your schedule couldn’t be saved. Please try again.", tone: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const visibleFeedback =
    feedback ?? (error ? { message: "Your local settings are unavailable right now.", tone: "danger" as const } : null);

  return (
    <SettingsFormLayout
      title="Schedule"
      isSaving={isSaving}
      onSave={() => void save()}
      feedback={
        visibleFeedback ? (
          <SettingsFeedback tone={visibleFeedback.tone}>{visibleFeedback.message}</SettingsFeedback>
        ) : null
      }
    >
      <SettingsSection title="Weekly intention" description="Choose the days that fit your week.">
        <WeekdaySelector
          selected={draft.selectedWeekdays}
          onChange={(selectedWeekdays) => setDraft((current) => ({ ...current, selectedWeekdays }))}
        />
      </SettingsSection>

      <SettingsSection
        title="Sessions per chosen day"
        description="Keep the intention realistic and easy to return to."
      >
        <SessionsPerDayControl
          value={draft.sessionsPerDay}
          onChange={(sessionsPerDay) => setDraft((current) => ({ ...current, sessionsPerDay }))}
        />
      </SettingsSection>

      <SettingsSection title="Practice times" description="Each time is optional and can be changed at any time.">
        <PracticeTimeControls
          times={draft.practiceTimes}
          onChange={(practiceTimes) => setDraft((current) => ({ ...current, practiceTimes }))}
        />
        <AddPracticeTimeButton
          disabled={draft.practiceTimes.length >= MAX_PRACTICE_TIMES}
          onPress={() =>
            setDraft((current) => ({
              ...current,
              practiceTimes: [
                ...current.practiceTimes,
                {
                  id: createPracticeTimeId(),
                  label: `Practice ${current.practiceTimes.length + 1}`,
                  hour: 12,
                  minute: 0,
                  enabled: true,
                  reminderLeadMinutes: 10,
                },
              ],
            }))
          }
        />
      </SettingsSection>
    </SettingsFormLayout>
  );
}
