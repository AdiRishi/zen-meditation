import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Pressable, Switch, useWindowDimensions, View } from "react-native";

import { Typography } from "@/components/ui/typography";
import { GroupedList } from "@/components/ui/zen/list-row";
import { ZenCard } from "@/components/ui/zen/zen-card";
import { ZenIcon, type ZenIconName } from "@/components/ui/zen/zen-icon";
import { dateForPracticeTime, formatPracticeTime } from "@/domain/date-time";
import type { Appearance, PracticeTime } from "@/domain/meditation";
import { useThemeColors } from "@/hooks/use-theme-colors";

const REMINDER_LEAD_OPTIONS = [0, 5, 10, 15, 30] as const;

function minuteOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

type TimePickerControlProps = {
  accessibilityLabel: string;
  disabled: boolean;
  hour: number;
  minute: number;
  onChange: (date: Date) => void;
  testID: string;
  width: number;
};

function TimePickerControl({
  accessibilityLabel,
  disabled,
  hour,
  minute,
  onChange,
  testID,
  width,
}: TimePickerControlProps) {
  const colors = useThemeColors();
  const [isAndroidPickerOpen, setIsAndroidPickerOpen] = useState(false);
  const value = dateForPracticeTime({ hour, minute });

  if (process.env.EXPO_OS !== "android") {
    return (
      <DateTimePicker
        accessibilityLabel={accessibilityLabel}
        accentColor={colors.accent}
        disabled={disabled}
        display="compact"
        minuteInterval={5}
        mode="time"
        onValueChange={(_, date) => onChange(date)}
        style={{ opacity: disabled ? 0.5 : 1, width }}
        testID={testID}
        value={value}
      />
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`${accessibilityLabel}, ${formatPracticeTime({ hour, minute })}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className="min-h-11 items-center justify-center rounded-xl bg-surface-secondary px-3"
        disabled={disabled}
        onPress={() => setIsAndroidPickerOpen(true)}
        testID={`${testID}.trigger`}
      >
        <Typography variant="small" tabularNums>
          {formatPracticeTime({ hour, minute })}
        </Typography>
      </Pressable>
      {isAndroidPickerOpen ? (
        <DateTimePicker
          display="default"
          minuteInterval={5}
          mode="time"
          onDismiss={() => setIsAndroidPickerOpen(false)}
          onValueChange={(_, date) => {
            setIsAndroidPickerOpen(false);
            onChange(date);
          }}
          testID={testID}
          value={value}
        />
      ) : null}
    </>
  );
}

function PracticeTimePicker({
  time,
  width,
  onChange,
}: {
  time: PracticeTime;
  width: number;
  onChange: (date: Date) => void;
}) {
  return (
    <TimePickerControl
      accessibilityLabel={`${time.label} time`}
      disabled={!time.enabled}
      hour={time.hour}
      minute={time.minute}
      onChange={onChange}
      testID={`schedule.${time.id}.time`}
      width={width}
    />
  );
}

export function PracticeTimeControls({
  times,
  onChange,
}: {
  times: PracticeTime[];
  onChange: (times: PracticeTime[]) => void;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isNarrow = width < 360;

  const updateTime = (id: string, update: Partial<PracticeTime>) => {
    onChange(times.map((time) => (time.id === id ? { ...time, ...update } : time)));
  };

  return (
    <GroupedList>
      {times.map((time) => (
        <View key={time.id}>
          <View className="min-h-20 gap-3 px-4 py-3">
            <View className="flex-row items-center gap-3">
              <View className="w-8 items-center justify-center">
                <ZenIcon name={time.hour < 12 ? "sun" : "moon"} size={22} tintColor={colors.muted} />
              </View>
              <Typography variant="body" className="flex-1">
                {time.label}
              </Typography>
              {isNarrow ? null : (
                <PracticeTimePicker
                  time={time}
                  width={92}
                  onChange={(date) => {
                    updateTime(time.id, { hour: date.getHours(), minute: date.getMinutes() });
                  }}
                />
              )}
              <Switch
                accessibilityLabel={`${time.label} practice time`}
                accessibilityState={{ checked: time.enabled }}
                ios_backgroundColor={colors.border}
                onValueChange={(enabled) => updateTime(time.id, { enabled })}
                trackColor={{ false: colors.border, true: colors.accent }}
                value={time.enabled}
              />
            </View>
            {isNarrow ? (
              <View className="pl-[52px]">
                <PracticeTimePicker
                  time={time}
                  width={112}
                  onChange={(date) => {
                    updateTime(time.id, { hour: date.getHours(), minute: date.getMinutes() });
                  }}
                />
              </View>
            ) : null}
          </View>
          {time.id === "morning" || time.id === "evening" ? null : (
            <Pressable
              accessibilityLabel={`Remove ${time.label}`}
              accessibilityRole="button"
              className="min-h-11 items-end justify-center px-4 pb-2"
              onPress={() => onChange(times.filter((candidate) => candidate.id !== time.id))}
            >
              <Typography variant="small" tone="muted">
                Remove
              </Typography>
            </Pressable>
          )}
        </View>
      ))}
    </GroupedList>
  );
}

export function AddPracticeTimeButton({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel="Add a practice time"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`min-h-14 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border ${
        disabled ? "opacity-50" : ""
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      <ZenIcon name="plus" size={18} tintColor={colors.foreground} />
      <Typography variant="body">Add a time</Typography>
    </Pressable>
  );
}

function reminderLeadLabel(minutes: number) {
  return minutes === 0 ? "At start time" : `${minutes} min before`;
}

export function ReminderTimeControls({
  times,
  enabled,
  onChange,
}: {
  times: PracticeTime[];
  enabled: boolean;
  onChange: (times: PracticeTime[]) => void;
}) {
  const colors = useThemeColors();

  const updateLeadTime = (id: string, reminderLeadMinutes: number) => {
    onChange(times.map((time) => (time.id === id ? { ...time, reminderLeadMinutes } : time)));
  };

  return (
    <View className="gap-3">
      {times.map((time) => {
        const isDisabled = !enabled || !time.enabled;
        return (
          <ZenCard key={time.id} className={`gap-3 px-4 py-4 ${isDisabled ? "opacity-60" : ""}`}>
            <View className="flex-row items-center gap-3">
              <View className="w-8 items-center justify-center">
                <ZenIcon name={time.hour < 12 ? "sun" : "moon"} size={22} tintColor={colors.muted} />
              </View>
              <View className="flex-1">
                <Typography variant="body">{time.label}</Typography>
                <Typography variant="small" tone="muted">
                  {time.enabled ? reminderLeadLabel(time.reminderLeadMinutes) : "Practice time is off"}
                </Typography>
              </View>
            </View>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
              {REMINDER_LEAD_OPTIONS.map((minutes) => {
                const isSelected = time.reminderLeadMinutes === minutes;
                return (
                  <Pressable
                    key={minutes}
                    accessibilityLabel={`${time.label}, ${reminderLeadLabel(minutes)}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                    className={`min-h-11 justify-center rounded-full border px-3 ${
                      isSelected ? "border-accent bg-accent-soft" : "border-border bg-transparent"
                    }`}
                    disabled={isDisabled}
                    onPress={() => updateLeadTime(time.id, minutes)}
                  >
                    <Typography variant="caption">{minutes === 0 ? "At time" : `${minutes} min`}</Typography>
                  </Pressable>
                );
              })}
            </View>
          </ZenCard>
        );
      })}
    </View>
  );
}

export function QuietHoursControl({
  startMinute,
  endMinute,
  enabled,
  onChange,
}: {
  startMinute: number;
  endMinute: number;
  enabled: boolean;
  onChange: (value: { startMinute: number; endMinute: number }) => void;
}) {
  const colors = useThemeColors();
  const timeRows = [
    { id: "start", label: "Starts", value: startMinute },
    { id: "end", label: "Ends", value: endMinute },
  ] as const;

  return (
    <GroupedList className={enabled ? undefined : "opacity-60"}>
      {timeRows.map((row) => (
        <View key={row.id} className="min-h-16 flex-row items-center gap-3 px-4 py-3">
          <View className="w-8 items-center justify-center">
            <ZenIcon name={row.id === "start" ? "moon" : "sun"} size={22} tintColor={colors.muted} />
          </View>
          <Typography variant="body" className="flex-1">
            {row.label}
          </Typography>
          <TimePickerControl
            accessibilityLabel={`Quiet hours ${row.label.toLowerCase()}`}
            disabled={!enabled}
            hour={Math.floor(row.value / 60)}
            minute={row.value % 60}
            onChange={(date) => {
              onChange({
                startMinute: row.id === "start" ? minuteOfDay(date) : startMinute,
                endMinute: row.id === "end" ? minuteOfDay(date) : endMinute,
              });
            }}
            testID={`reminders.quiet-hours.${row.id}`}
            width={100}
          />
        </View>
      ))}
    </GroupedList>
  );
}

export function SettingsToggleCard({
  icon,
  label,
  value,
  enabled,
  disabled,
  onChange,
}: {
  icon: ZenIconName;
  label: string;
  value?: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const colors = useThemeColors();

  return (
    <ZenCard>
      <View className="min-h-16 flex-row items-center gap-4 px-4 py-3">
        <View className="w-8 items-center justify-center">
          <ZenIcon name={icon} size={22} tintColor={colors.muted} />
        </View>
        <View className="flex-1 gap-0.5">
          <Typography variant="body">{label}</Typography>
          {value ? (
            <Typography variant="small" tone="muted">
              {value}
            </Typography>
          ) : null}
        </View>
        <Switch
          accessibilityLabel={label}
          accessibilityState={{ checked: enabled, disabled }}
          disabled={disabled}
          ios_backgroundColor={colors.border}
          onValueChange={onChange}
          trackColor={{ false: colors.border, true: colors.accent }}
          value={enabled}
        />
      </View>
    </ZenCard>
  );
}

const APPEARANCE_OPTIONS: readonly { value: Appearance; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Follow your device setting" },
  { value: "light", label: "Light", description: "Warm, quiet tones" },
  { value: "dark", label: "Dark", description: "A softer low-light canvas" },
];

export function AppearanceChoiceList({
  value,
  disabled,
  onChange,
}: {
  value: Appearance;
  disabled?: boolean;
  onChange: (value: Appearance) => void;
}) {
  const colors = useThemeColors();

  return (
    <GroupedList accessibilityRole="radiogroup">
      {APPEARANCE_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityLabel={`${option.label} appearance`}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled }}
            className="min-h-16 flex-row items-center gap-3 px-4 py-3"
            disabled={disabled}
            onPress={() => onChange(option.value)}
          >
            <View className="flex-1 gap-0.5">
              <Typography variant="body">{option.label}</Typography>
              <Typography variant="small" tone="muted">
                {option.description}
              </Typography>
            </View>
            <View
              className={`size-6 items-center justify-center rounded-full border ${
                isSelected ? "border-accent bg-accent" : "border-stone"
              }`}
            >
              {isSelected ? <ZenIcon name="check" size={14} tintColor={colors.accentForeground} /> : null}
            </View>
          </Pressable>
        );
      })}
    </GroupedList>
  );
}
