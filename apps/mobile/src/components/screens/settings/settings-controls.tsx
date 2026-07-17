import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState, type ReactNode } from "react";
import { Switch, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { GroupedList } from "@/components/ui/moss/list-row";
import { MossCard } from "@/components/ui/moss/moss-card";
import { MossIcon, type MossIconName } from "@/components/ui/moss/moss-icon";
import { MossPressable } from "@/components/ui/moss/moss-pressable";
import { Typography } from "@/components/ui/typography";
import { dateForPracticeTime, formatPracticeTime } from "@/domain/date-time";
import type { Appearance, PracticeTime } from "@/domain/meditation";
import { useSelectionTransition } from "@/hooks/use-selection-transition";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { crossfadeIn, crossfadeOut, durations, easings, glide } from "@/lib/motion";
import { useMeditation } from "@/providers/meditation-provider";

const REMINDER_LEAD_OPTIONS = [0, 5, 10, 15, 30] as const;

function minuteOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

/** Eases a control toward its disabled dimming — a fade RM keeps, never a snap. */
function FadeToDisabled({
  dimmed,
  dimmedOpacity = 0.6,
  children,
}: {
  dimmed: boolean;
  dimmedOpacity?: number;
  children: ReactNode;
}) {
  const opacity = useSharedValue(dimmed ? dimmedOpacity : 1);

  useEffect(() => {
    opacity.set(withTiming(dimmed ? dimmedOpacity : 1, { duration: durations.crossfade, easing: easings.exit }));
  }, [dimmed, dimmedOpacity, opacity]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return <Animated.View style={dimStyle}>{children}</Animated.View>;
}

type TimePickerControlProps = {
  accessibilityLabel: string;
  disabled: boolean;
  dimWhenDisabled?: boolean;
  hour: number;
  minute: number;
  onChange: (date: Date) => void;
  testID: string;
  width: number;
};

function TimePickerControl({
  accessibilityLabel,
  disabled,
  dimWhenDisabled = true,
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
      <FadeToDisabled dimmed={disabled && dimWhenDisabled} dimmedOpacity={0.5}>
        <DateTimePicker
          accessibilityLabel={accessibilityLabel}
          accentColor={colors.accent}
          disabled={disabled}
          display="compact"
          minuteInterval={5}
          mode="time"
          onValueChange={(_, date) => onChange(date)}
          style={{ width }}
          testID={testID}
          value={value}
        />
      </FadeToDisabled>
    );
  }

  return (
    <>
      <MossPressable
        accessibilityLabel={`${accessibilityLabel}, ${formatPracticeTime({ hour, minute })}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        feedback="dim"
        className="min-h-11 items-center justify-center rounded-xl bg-surface-secondary px-3"
        disabled={disabled}
        onPress={() => setIsAndroidPickerOpen(true)}
        testID={`${testID}.trigger`}
      >
        <Typography variant="small" tabularNums>
          {formatPracticeTime({ hour, minute })}
        </Typography>
      </MossPressable>
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
  const { reducedMotion } = useMeditation();
  const { width } = useWindowDimensions();
  const isNarrow = width < 360;

  const updateTime = (id: string, update: Partial<PracticeTime>) => {
    onChange(times.map((time) => (time.id === id ? { ...time, ...update } : time)));
  };

  return (
    <GroupedList>
      {times.map((time) => (
        // Added times fade in, removed times fade out, and the list glides closed.
        <Animated.View key={time.id} entering={crossfadeIn} exiting={crossfadeOut} layout={glide(reducedMotion)}>
          <View className="min-h-20 gap-3 px-4 py-3">
            <View className="flex-row items-center gap-3">
              <View className="w-8 items-center justify-center">
                <MossIcon name={time.hour < 12 ? "sun" : "moon"} size={22} tintColor={colors.muted} />
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
            <MossPressable
              accessibilityLabel={`Remove ${time.label}`}
              accessibilityRole="button"
              feedback="dim"
              className="min-h-11 items-end justify-center px-4 pb-2"
              onPress={() => onChange(times.filter((candidate) => candidate.id !== time.id))}
            >
              <Typography variant="small" tone="muted">
                Remove
              </Typography>
            </MossPressable>
          )}
        </Animated.View>
      ))}
    </GroupedList>
  );
}

export function AddPracticeTimeButton({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  const colors = useThemeColors();

  return (
    <FadeToDisabled dimmed={disabled} dimmedOpacity={0.5}>
      <MossPressable
        accessibilityLabel="Add a practice time"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        feedback="scale"
        pressedScale={0.98}
        className="min-h-14 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border"
        disabled={disabled}
        onPress={onPress}
      >
        <MossIcon name="plus" size={18} tintColor={colors.foreground} />
        <Typography variant="body">Add a time</Typography>
      </MossPressable>
    </FadeToDisabled>
  );
}

function reminderLeadLabel(minutes: number) {
  return minutes === 0 ? "At start time" : `${minutes} min before`;
}

function ReminderLeadChip({
  label,
  accessibilityLabel,
  isSelected,
  disabled,
  onSelect,
}: {
  label: string;
  accessibilityLabel: string;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { fillStyle } = useSelectionTransition(isSelected);

  return (
    <MossPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled }}
      feedback="scale"
      pressedScale={0.96}
      className="min-h-11 justify-center rounded-full border border-border bg-transparent px-3"
      disabled={disabled}
      onPress={onSelect}
    >
      <Animated.View
        pointerEvents="none"
        style={fillStyle}
        className="absolute inset-0 rounded-full border border-accent bg-accent-soft"
      />
      <Typography variant="caption">{label}</Typography>
    </MossPressable>
  );
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
          <FadeToDisabled key={time.id} dimmed={isDisabled}>
            <MossCard className="gap-3 px-4 py-4">
              <View className="flex-row items-center gap-3">
                <View className="w-8 items-center justify-center">
                  <MossIcon name={time.hour < 12 ? "sun" : "moon"} size={22} tintColor={colors.muted} />
                </View>
                <View className="flex-1">
                  <Typography variant="body">{time.label}</Typography>
                  <Typography variant="small" tone="muted">
                    {time.enabled ? reminderLeadLabel(time.reminderLeadMinutes) : "Practice time is off"}
                  </Typography>
                </View>
              </View>
              <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                {REMINDER_LEAD_OPTIONS.map((minutes) => (
                  <ReminderLeadChip
                    key={minutes}
                    accessibilityLabel={`${time.label}, ${reminderLeadLabel(minutes)}`}
                    label={minutes === 0 ? "At time" : `${minutes} min`}
                    isSelected={time.reminderLeadMinutes === minutes}
                    disabled={isDisabled}
                    onSelect={() => updateLeadTime(time.id, minutes)}
                  />
                ))}
              </View>
            </MossCard>
          </FadeToDisabled>
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
    <FadeToDisabled dimmed={!enabled}>
      <GroupedList>
        {timeRows.map((row) => (
          <View key={row.id} className="min-h-16 flex-row items-center gap-3 px-4 py-3">
            <View className="w-8 items-center justify-center">
              <MossIcon name={row.id === "start" ? "moon" : "sun"} size={22} tintColor={colors.muted} />
            </View>
            <Typography variant="body" className="flex-1">
              {row.label}
            </Typography>
            <TimePickerControl
              accessibilityLabel={`Quiet hours ${row.label.toLowerCase()}`}
              disabled={!enabled}
              dimWhenDisabled={false}
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
    </FadeToDisabled>
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
  icon: MossIconName;
  label: string;
  value?: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const colors = useThemeColors();

  return (
    <MossCard>
      <View className="min-h-16 flex-row items-center gap-4 px-4 py-3">
        <View className="w-8 items-center justify-center">
          <MossIcon name={icon} size={22} tintColor={colors.muted} />
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
    </MossCard>
  );
}

const APPEARANCE_OPTIONS: readonly { value: Appearance; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Follow your device setting" },
  { value: "light", label: "Light", description: "Warm, quiet tones" },
  { value: "dark", label: "Dark", description: "A softer low-light canvas" },
];

function AppearanceChoiceRow({
  label,
  description,
  isSelected,
  disabled,
  onSelect,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const colors = useThemeColors();
  const { fillStyle, indicatorStyle } = useSelectionTransition(isSelected);

  return (
    <MossPressable
      accessibilityLabel={`${label} appearance`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled }}
      feedback="highlight"
      className="min-h-16 flex-row items-center gap-3 px-4 py-3"
      disabled={disabled}
      onPress={onSelect}
    >
      <View className="flex-1 gap-0.5">
        <Typography variant="body">{label}</Typography>
        <Typography variant="small" tone="muted">
          {description}
        </Typography>
      </View>
      <View className="size-6 items-center justify-center rounded-full border border-stone">
        <Animated.View
          pointerEvents="none"
          style={fillStyle}
          className="absolute inset-0 rounded-full border border-accent bg-accent"
        />
        <Animated.View pointerEvents="none" style={indicatorStyle}>
          <MossIcon name="check" size={14} tintColor={colors.accentForeground} />
        </Animated.View>
      </View>
    </MossPressable>
  );
}

export function AppearanceChoiceList({
  value,
  disabled,
  onChange,
}: {
  value: Appearance;
  disabled?: boolean;
  onChange: (value: Appearance) => void;
}) {
  return (
    <GroupedList accessibilityRole="radiogroup">
      {APPEARANCE_OPTIONS.map((option) => (
        <AppearanceChoiceRow
          key={option.value}
          label={option.label}
          description={option.description}
          isSelected={option.value === value}
          disabled={disabled}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </GroupedList>
  );
}
