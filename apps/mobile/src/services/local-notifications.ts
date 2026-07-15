import * as Notifications from "expo-notifications";

import type { AppPreferences, CompletionSound } from "@/domain/meditation";
import { SerialTaskQueue } from "@/lib/serial-task-queue";

export const PRACTICE_REMINDER_BODY = "Time for a quiet pause.";

const SESSION_COMPLETION_BODY = "Your quiet pause is complete.";
const NOTIFICATION_KIND_KEY = "mossNotificationKind";
const WEEKLY_REMINDER_KIND = "weekly-practice-reminder";
const SESSION_COMPLETION_KIND = "session-completion";
const SESSION_COMPLETION_TIME_KEY = "scheduledAtMs";
const SESSION_COMPLETION_SOUND_KEY = "sound";
const REMINDER_CHANNEL_ID = "moss-practice-reminders";
const SESSION_COMPLETION_CHANNEL_PREFIX = "moss-session-completion";
const MINUTES_PER_DAY = 24 * 60;

const COMPLETION_SOUND_FILENAMES = {
  "soft-chime": "soft_chime.wav",
  "low-bowl": "low_bowl.wav",
  "wood-tone": "wood_tone.wav",
} as const satisfies Record<CompletionSound, string>;

export type MossNotificationKind = typeof WEEKLY_REMINDER_KIND | typeof SESSION_COMPLETION_KIND;

export function getMossNotificationKind(data: Record<string, unknown> | null | undefined): MossNotificationKind | null {
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
  syncSessionCompletion(notification: SessionCompletionNotification | null): Promise<boolean>;
  clearAllManagedNotifications(): Promise<void>;
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
        identifier: `moss.weekly-practice-reminder.${planKey}`,
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

function isManagedNotification(notification: ScheduledNotificationSummary, kind?: MossNotificationKind) {
  const notificationKind = getMossNotificationKind(notification.content.data);
  return notificationKind !== null && (!kind || notificationKind === kind);
}

function sessionCompletionIdentifier(sessionId: string) {
  return `moss.session-completion.${sessionId}`;
}

function sessionCompletionChannelId(sound: CompletionSound) {
  return `${SESSION_COMPLETION_CHANNEL_PREFIX}.${sound}`;
}

function matchesSessionCompletion(notification: ScheduledNotificationSummary, desired: SessionCompletionNotification) {
  const data = notification.content.data;
  return (
    notification.identifier === sessionCompletionIdentifier(desired.sessionId) &&
    data?.sessionId === desired.sessionId &&
    data?.[SESSION_COMPLETION_TIME_KEY] === desired.scheduledAtMs &&
    data?.[SESSION_COMPLETION_SOUND_KEY] === desired.sound
  );
}

export function createLocalNotifications(nativeApi: LocalNotificationsNativeApi): LocalNotifications {
  const mutationQueue = new SerialTaskQueue();

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

  async function getManagedNotifications(kind?: MossNotificationKind) {
    const scheduled = await nativeApi.getAllScheduledNotificationsAsync();
    return scheduled
      .filter((notification) => isManagedNotification(notification, kind))
      .sort((left, right) => left.identifier.localeCompare(right.identifier));
  }

  async function cancelNotifications(notifications: readonly ScheduledNotificationSummary[]) {
    for (const notification of notifications) {
      await nativeApi.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  async function scheduleSessionCompletion({ sessionId, scheduledAtMs, sound }: SessionCompletionNotification) {
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
        title: "Moss",
        body: SESSION_COMPLETION_BODY,
        sound: filename,
        data: {
          [NOTIFICATION_KIND_KEY]: SESSION_COMPLETION_KIND,
          sessionId,
          [SESSION_COMPLETION_TIME_KEY]: scheduledAtMs,
          [SESSION_COMPLETION_SOUND_KEY]: sound,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId,
        date: scheduledAtMs,
      },
    });

    return true;
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
      return mutationQueue.run(async () => {
        const permissionStatus = await getPermissionStatus();
        const plans = preferences.remindersEnabled ? buildReminderPlans(preferences) : [];
        const existing = await getManagedNotifications(WEEKLY_REMINDER_KIND);

        if (permissionStatus !== "granted" || plans.length === 0) {
          await cancelNotifications(existing);
          return { permissionStatus, scheduledCount: 0 };
        }

        await ensureReminderChannel();
        const desiredIdentifiers = new Set(plans.map((plan) => plan.identifier));
        const existingIdentifiers = new Set(existing.map((notification) => notification.identifier));
        const scheduledIdentifiers: string[] = [];

        try {
          for (const plan of plans) {
            if (existingIdentifiers.has(plan.identifier)) {
              continue;
            }
            const identifier = await nativeApi.scheduleNotificationAsync({
              identifier: plan.identifier,
              content: {
                title: "Moss",
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

        await cancelNotifications(existing.filter((notification) => !desiredIdentifiers.has(notification.identifier)));
        return { permissionStatus, scheduledCount: plans.length };
      });
    },

    async syncSessionCompletion(notification) {
      return mutationQueue.run(async () => {
        const existing = await getManagedNotifications(SESSION_COMPLETION_KIND);
        if (!notification) {
          await cancelNotifications(existing);
          return false;
        }

        const desiredIdentifier = sessionCompletionIdentifier(notification.sessionId);
        const matching = existing.find((scheduled) => matchesSessionCompletion(scheduled, notification));
        if (matching) {
          await cancelNotifications(existing.filter((scheduled) => scheduled.identifier !== desiredIdentifier));
          return true;
        }

        let scheduled: boolean;
        try {
          scheduled = await scheduleSessionCompletion(notification);
        } catch (error) {
          await Promise.allSettled(existing.map((item) => nativeApi.cancelScheduledNotificationAsync(item.identifier)));
          throw error;
        }
        if (!scheduled) {
          await cancelNotifications(existing);
          return false;
        }
        await cancelNotifications(existing.filter((item) => item.identifier !== desiredIdentifier));
        return true;
      });
    },

    async clearAllManagedNotifications() {
      await mutationQueue.run(async () => cancelNotifications(await getManagedNotifications()));
    },
  };
}

const expoNotificationsNativeApi: LocalNotificationsNativeApi = {
  getPermissionsAsync: Notifications.getPermissionsAsync,
  requestPermissionsAsync: Notifications.requestPermissionsAsync,
  getAllScheduledNotificationsAsync: Notifications.getAllScheduledNotificationsAsync,
  scheduleNotificationAsync: Notifications.scheduleNotificationAsync,
  cancelScheduledNotificationAsync: Notifications.cancelScheduledNotificationAsync,
  setNotificationChannelAsync: Notifications.setNotificationChannelAsync,
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
