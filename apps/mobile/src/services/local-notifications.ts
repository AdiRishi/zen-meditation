import * as Notifications from "expo-notifications";

import type { AppPreferences, CompletionSound } from "@/domain/meditation";

export const PRACTICE_REMINDER_BODY = "Time for a quiet pause.";

const SESSION_COMPLETION_BODY = "Your quiet pause is complete.";
const NOTIFICATION_KIND_KEY = "zenNotificationKind";
const WEEKLY_REMINDER_KIND = "weekly-practice-reminder";
const SESSION_COMPLETION_KIND = "session-completion";
const REMINDER_CHANNEL_ID = "zen-practice-reminders";
const SESSION_COMPLETION_CHANNEL_PREFIX = "zen-session-completion";
const MINUTES_PER_DAY = 24 * 60;

const COMPLETION_SOUND_FILENAMES = {
  "soft-chime": "soft_chime.wav",
  "low-bowl": "low_bowl.wav",
  "wood-tone": "wood_tone.wav",
} as const satisfies Record<CompletionSound, string>;

export type ZenNotificationKind = typeof WEEKLY_REMINDER_KIND | typeof SESSION_COMPLETION_KIND;

export function getZenNotificationKind(data: Record<string, unknown> | null | undefined): ZenNotificationKind | null {
  const kind = data?.[NOTIFICATION_KIND_KEY];
  return kind === WEEKLY_REMINDER_KIND || kind === SESSION_COMPLETION_KIND ? kind : null;
}

export type LocalNotificationPermissionStatus = "granted" | "denied" | "undetermined";

export type ReminderSchedulingResult = {
  permissionStatus: LocalNotificationPermissionStatus;
  scheduledCount: number;
};

export type SessionCompletionNotification = {
  sessionId: string;
  scheduledAtMs: number;
  sound: CompletionSound;
};

export interface LocalNotifications {
  getPermissionStatus(): Promise<LocalNotificationPermissionStatus>;
  requestPermission(): Promise<LocalNotificationPermissionStatus>;
  rescheduleWeeklyReminders(preferences: AppPreferences): Promise<ReminderSchedulingResult>;
  scheduleSessionCompletion(notification: SessionCompletionNotification): Promise<boolean>;
  cancelSessionCompletion(sessionId: string): Promise<void>;
}

type ScheduledNotificationSummary = {
  identifier: string;
  content: {
    data?: Record<string, unknown>;
  };
};

export interface LocalNotificationsNativeApi {
  getPermissionsAsync(): Promise<Notifications.NotificationPermissionsStatus>;
  requestPermissionsAsync(
    request?: Notifications.NotificationPermissionsRequest,
  ): Promise<Notifications.NotificationPermissionsStatus>;
  getAllScheduledNotificationsAsync(): Promise<readonly ScheduledNotificationSummary[]>;
  scheduleNotificationAsync(request: Notifications.NotificationRequestInput): Promise<string>;
  cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  setNotificationChannelAsync(channelId: string, channel: Notifications.NotificationChannelInput): Promise<unknown>;
}

type ReminderPlan = {
  identifier: string;
  weekday: number;
  hour: number;
  minute: number;
};

function permissionStatusFromNative(
  status: Notifications.NotificationPermissionsStatus,
): LocalNotificationPermissionStatus {
  const iosStatus = status.ios?.status;
  const hasNonInterruptingPermission =
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;

  if (status.granted || hasNonInterruptingPermission) {
    return "granted";
  }

  return status.status === "undetermined" ? "undetermined" : "denied";
}

function isMinuteInsideQuietHours(minute: number, preferences: AppPreferences) {
  const { startMinute, endMinute } = preferences.quietHours;

  if (startMinute === endMinute) {
    return false;
  }

  if (startMinute < endMinute) {
    return minute >= startMinute && minute < endMinute;
  }

  return minute >= startMinute || minute < endMinute;
}

function buildReminderPlans(preferences: AppPreferences): ReminderPlan[] {
  const selectedWeekdays = [...new Set(preferences.selectedWeekdays)].sort((left, right) => left - right);
  const enabledTimes = preferences.practiceTimes
    .filter((time) => time.enabled)
    .sort((left, right) => left.hour - right.hour || left.minute - right.minute || left.id.localeCompare(right.id));
  const plans = new Map<string, ReminderPlan>();

  for (const practiceWeekday of selectedWeekdays) {
    for (const practiceTime of enabledTimes) {
      const unwrappedMinute = practiceTime.hour * 60 + practiceTime.minute - practiceTime.reminderLeadMinutes;
      const dayOffset = Math.floor(unwrappedMinute / MINUTES_PER_DAY);
      const reminderMinute = ((unwrappedMinute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

      if (isMinuteInsideQuietHours(reminderMinute, preferences)) {
        continue;
      }

      const reminderWeekday = (((practiceWeekday + dayOffset) % 7) + 7) % 7;
      const expoWeekday = reminderWeekday + 1;
      const hour = Math.floor(reminderMinute / 60);
      const minute = reminderMinute % 60;
      const planKey = `${expoWeekday}.${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;

      plans.set(planKey, {
        identifier: `zen.weekly-practice-reminder.${planKey}`,
        weekday: expoWeekday,
        hour,
        minute,
      });
    }
  }

  return [...plans.values()].sort(
    (left, right) => left.weekday - right.weekday || left.hour - right.hour || left.minute - right.minute,
  );
}

function isManagedWeeklyReminder(notification: ScheduledNotificationSummary) {
  return notification.content.data?.[NOTIFICATION_KIND_KEY] === WEEKLY_REMINDER_KIND;
}

function sessionCompletionIdentifier(sessionId: string) {
  return `zen.session-completion.${sessionId}`;
}

function sessionCompletionChannelId(sound: CompletionSound) {
  return `${SESSION_COMPLETION_CHANNEL_PREFIX}.${sound}`;
}

export function createLocalNotifications(nativeApi: LocalNotificationsNativeApi): LocalNotifications {
  async function getPermissionStatus() {
    return permissionStatusFromNative(await nativeApi.getPermissionsAsync());
  }

  async function ensureReminderChannel() {
    await nativeApi.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Practice reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  async function cancelManagedWeeklyReminders() {
    const scheduled = await nativeApi.getAllScheduledNotificationsAsync();
    const identifiers = scheduled
      .filter(isManagedWeeklyReminder)
      .map((notification) => notification.identifier)
      .sort();

    for (const identifier of identifiers) {
      await nativeApi.cancelScheduledNotificationAsync(identifier);
    }
  }

  return {
    getPermissionStatus,

    async requestPermission() {
      await ensureReminderChannel();
      const status = await nativeApi.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
        },
        android: {},
      });
      return permissionStatusFromNative(status);
    },

    async rescheduleWeeklyReminders(preferences) {
      await cancelManagedWeeklyReminders();
      const permissionStatus = await getPermissionStatus();
      const plans = preferences.remindersEnabled ? buildReminderPlans(preferences) : [];

      if (permissionStatus !== "granted" || plans.length === 0) {
        return { permissionStatus, scheduledCount: 0 };
      }

      await ensureReminderChannel();
      const scheduledIdentifiers: string[] = [];

      try {
        for (const plan of plans) {
          const identifier = await nativeApi.scheduleNotificationAsync({
            identifier: plan.identifier,
            content: {
              title: "Zen",
              body: PRACTICE_REMINDER_BODY,
              sound: "default",
              data: { [NOTIFICATION_KIND_KEY]: WEEKLY_REMINDER_KIND },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              channelId: REMINDER_CHANNEL_ID,
              weekday: plan.weekday,
              hour: plan.hour,
              minute: plan.minute,
            },
          });
          scheduledIdentifiers.push(identifier);
        }
      } catch (error) {
        await Promise.allSettled(
          scheduledIdentifiers.map((identifier) => nativeApi.cancelScheduledNotificationAsync(identifier)),
        );
        throw error;
      }

      return { permissionStatus, scheduledCount: scheduledIdentifiers.length };
    },

    async scheduleSessionCompletion({ sessionId, scheduledAtMs, sound }) {
      if (!sessionId) {
        throw new Error("A session ID is required to schedule its completion notification.");
      }
      if (!Number.isFinite(scheduledAtMs)) {
        throw new Error("A finite completion time is required to schedule a notification.");
      }
      if ((await getPermissionStatus()) !== "granted") {
        return false;
      }

      const filename = COMPLETION_SOUND_FILENAMES[sound];
      const channelId = sessionCompletionChannelId(sound);
      await nativeApi.setNotificationChannelAsync(channelId, {
        name: "Session completion",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: filename,
        enableVibrate: false,
      });
      await nativeApi.scheduleNotificationAsync({
        identifier: sessionCompletionIdentifier(sessionId),
        content: {
          title: "Zen",
          body: SESSION_COMPLETION_BODY,
          sound: filename,
          data: {
            [NOTIFICATION_KIND_KEY]: SESSION_COMPLETION_KIND,
            sessionId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId,
          date: scheduledAtMs,
        },
      });

      return true;
    },

    async cancelSessionCompletion(sessionId) {
      await nativeApi.cancelScheduledNotificationAsync(sessionCompletionIdentifier(sessionId));
    },
  };
}

const expoNotificationsNativeApi: LocalNotificationsNativeApi = {
  getPermissionsAsync: Notifications.getPermissionsAsync.bind(Notifications),
  requestPermissionsAsync: Notifications.requestPermissionsAsync.bind(Notifications),
  getAllScheduledNotificationsAsync: Notifications.getAllScheduledNotificationsAsync.bind(Notifications),
  scheduleNotificationAsync: Notifications.scheduleNotificationAsync.bind(Notifications),
  cancelScheduledNotificationAsync: Notifications.cancelScheduledNotificationAsync.bind(Notifications),
  setNotificationChannelAsync: Notifications.setNotificationChannelAsync.bind(Notifications),
};

export const localNotifications = createLocalNotifications(expoNotificationsNativeApi);

export function configureForegroundNotificationHandling() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isSessionCompletion =
        notification.request.content.data?.[NOTIFICATION_KIND_KEY] === SESSION_COMPLETION_KIND;
      return {
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: !isSessionCompletion,
        shouldShowList: !isSessionCompletion,
      };
    },
  });
}
