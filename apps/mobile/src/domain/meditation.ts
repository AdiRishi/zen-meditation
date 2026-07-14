import { z } from "zod";

export const completionSoundSchema = z.enum(["soft-chime", "low-bowl", "wood-tone"]);
export const feelingSchema = z.enum(["calm", "clear", "grounded", "other"]);
export const appearanceSchema = z.enum(["system", "light", "dark"]);
export const onboardingStepSchema = z.enum(["welcome", "goal", "schedule", "reminders", "complete"]);
export const SESSION_DURATIONS = [5, 10, 15, 20, 30] as const;
export const sessionDurationSchema = z.literal(SESSION_DURATIONS);
export const MAX_PRACTICE_TIMES = 4;
export const weekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const practiceTimeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  enabled: z.boolean(),
  reminderLeadMinutes: z.number().int().min(0).max(120),
});

export const appPreferencesSchema = z.object({
  onboardingStep: onboardingStepSchema,
  onboardingCompleted: z.boolean(),
  selectedWeekdays: z.array(weekdaySchema).min(1),
  sessionsPerDay: z.number().int().min(1).max(3),
  practiceTimes: z.array(practiceTimeSchema).max(MAX_PRACTICE_TIMES),
  remindersEnabled: z.boolean(),
  quietHours: z.object({
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(0).max(1439),
  }),
  completionSound: completionSoundSchema,
  lastDurationMinutes: sessionDurationSchema,
  appearance: appearanceSchema,
  reducedMotion: z.boolean(),
});

export const activeSessionSchema = z.object({
  id: z.string().min(1),
  plannedDurationMs: z.number().int().positive(),
  startedAtMs: z.number().int().nonnegative(),
  accumulatedActiveMs: z.number().int().nonnegative(),
  resumedAtMs: z.number().int().nonnegative().nullable(),
  status: z.enum(["running", "paused"]),
  completionSound: completionSoundSchema,
  completionLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completionTimezoneOffsetMinutes: z.number().int(),
});

export const completedSessionSchema = z
  .object({
    id: z.string().min(1),
    startedAtMs: z.number().int().nonnegative(),
    completedAtMs: z.number().int().nonnegative(),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezoneOffsetMinutes: z.number().int(),
    durationMs: z.number().int().positive(),
    completionSound: completionSoundSchema,
    feeling: feelingSchema.nullable(),
    acknowledgedAtMs: z.number().int().nonnegative().nullable(),
  })
  .refine((session) => session.completedAtMs >= session.startedAtMs, {
    message: "Completion time cannot precede the session start.",
    path: ["completedAtMs"],
  })
  .refine((session) => session.acknowledgedAtMs === null || session.acknowledgedAtMs >= session.completedAtMs, {
    message: "Acknowledgment time cannot precede completion.",
    path: ["acknowledgedAtMs"],
  });

export type CompletionSound = z.infer<typeof completionSoundSchema>;
export type Feeling = z.infer<typeof feelingSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;
export type SessionDuration = z.infer<typeof sessionDurationSchema>;
export type Weekday = z.infer<typeof weekdaySchema>;
export type PracticeTime = z.infer<typeof practiceTimeSchema>;
export type AppPreferences = z.infer<typeof appPreferencesSchema>;
export type ActiveSession = z.infer<typeof activeSessionSchema>;
export type CompletedSession = z.infer<typeof completedSessionSchema>;

export const COMPLETION_SOUNDS: readonly { id: CompletionSound; label: string }[] = [
  { id: "soft-chime", label: "Soft chime" },
  { id: "low-bowl", label: "Low bowl" },
  { id: "wood-tone", label: "Wood tone" },
];

export const DEFAULT_PREFERENCES: AppPreferences = {
  onboardingStep: "welcome",
  onboardingCompleted: false,
  selectedWeekdays: [1, 2, 3, 4, 5],
  sessionsPerDay: 1,
  practiceTimes: [
    {
      id: "morning",
      label: "Morning",
      hour: 7,
      minute: 0,
      enabled: true,
      reminderLeadMinutes: 10,
    },
    {
      id: "evening",
      label: "Evening",
      hour: 19,
      minute: 30,
      enabled: true,
      reminderLeadMinutes: 0,
    },
  ],
  remindersEnabled: false,
  quietHours: {
    startMinute: 21 * 60,
    endMinute: 7 * 60,
  },
  completionSound: "soft-chime",
  lastDurationMinutes: 10,
  appearance: "system",
  reducedMotion: false,
};

export function getCompletionSoundLabel(sound: CompletionSound) {
  return COMPLETION_SOUNDS.find((item) => item.id === sound)?.label ?? COMPLETION_SOUNDS[0].label;
}
