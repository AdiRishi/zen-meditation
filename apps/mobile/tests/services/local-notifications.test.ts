import type {
  NotificationChannelInput,
  NotificationPermissionsRequest,
  NotificationPermissionsStatus,
  NotificationRequestInput,
} from "expo-notifications";

import { DEFAULT_PREFERENCES, type AppPreferences } from "@/domain/meditation";
import {
  createLocalNotifications,
  getZenNotificationKind,
  type LocalNotificationsNativeApi,
  PRACTICE_REMINDER_BODY,
} from "@/services/local-notifications";

jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 5 },
  IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
  SchedulableTriggerInputTypes: { WEEKLY: "weekly", DATE: "date" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

type ScheduledNotification = Awaited<
  ReturnType<LocalNotificationsNativeApi["getAllScheduledNotificationsAsync"]>
>[number];

function permission(status: "granted" | "denied" | "undetermined", iosStatus?: number): NotificationPermissionsStatus {
  return {
    status: status as NotificationPermissionsStatus["status"],
    granted: status === "granted",
    canAskAgain: status === "undetermined",
    expires: "never",
    ...(iosStatus === undefined
      ? {}
      : {
          ios: {
            status: iosStatus,
          } as NotificationPermissionsStatus["ios"],
        }),
  };
}

class FakeNotificationsApi implements LocalNotificationsNativeApi {
  permission: NotificationPermissionsStatus;
  requestedPermission: NotificationPermissionsStatus;
  scheduled: ScheduledNotification[];
  readonly requests: NotificationRequestInput[] = [];
  readonly cancelled: string[] = [];
  readonly channels: { id: string; input: NotificationChannelInput }[] = [];
  permissionRequest: NotificationPermissionsRequest | undefined;

  constructor(currentPermission: NotificationPermissionsStatus, scheduled: ScheduledNotification[] = []) {
    this.permission = currentPermission;
    this.requestedPermission = currentPermission;
    this.scheduled = scheduled;
  }

  async getPermissionsAsync() {
    return this.permission;
  }

  async requestPermissionsAsync(request?: NotificationPermissionsRequest) {
    this.permissionRequest = request;
    this.permission = this.requestedPermission;
    return this.requestedPermission;
  }

  async getAllScheduledNotificationsAsync() {
    return this.scheduled;
  }

  async scheduleNotificationAsync(request: NotificationRequestInput) {
    const identifier = request.identifier ?? `notification-${this.requests.length + 1}`;
    this.requests.push(request);
    this.scheduled.push({
      identifier,
      content: { data: request.content.data },
    });
    return identifier;
  }

  async cancelScheduledNotificationAsync(identifier: string) {
    this.cancelled.push(identifier);
    this.scheduled = this.scheduled.filter((notification) => notification.identifier !== identifier);
  }

  async setNotificationChannelAsync(id: string, input: NotificationChannelInput) {
    this.channels.push({ id, input });
    return null;
  }
}

function preferences(overrides: Partial<AppPreferences> = {}): AppPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...overrides,
  };
}

describe("LocalNotifications", () => {
  it("recognizes only notification responses owned by Zen", () => {
    expect(getZenNotificationKind({ zenNotificationKind: "weekly-practice-reminder" })).toBe(
      "weekly-practice-reminder",
    );
    expect(getZenNotificationKind({ zenNotificationKind: "session-completion" })).toBe("session-completion");
    expect(getZenNotificationKind({ zenNotificationKind: "something-else" })).toBeNull();
  });

  it("reads the current device permission each time, including provisional iOS access", async () => {
    const nativeApi = new FakeNotificationsApi(permission("undetermined"));
    const notifications = createLocalNotifications(nativeApi);

    await expect(notifications.getPermissionStatus()).resolves.toBe("undetermined");

    nativeApi.permission = permission("denied");
    await expect(notifications.getPermissionStatus()).resolves.toBe("denied");

    nativeApi.permission = permission("denied", 3);
    await expect(notifications.getPermissionStatus()).resolves.toBe("granted");
  });

  it("requests only the alert and sound access used by Zen reminders", async () => {
    const nativeApi = new FakeNotificationsApi(permission("undetermined"));
    nativeApi.requestedPermission = permission("denied");
    const notifications = createLocalNotifications(nativeApi);

    await expect(notifications.requestPermission()).resolves.toBe("denied");
    expect(nativeApi.permissionRequest).toEqual({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
      android: {},
    });
  });

  it("replaces Zen reminders with deterministic weekly triggers outside quiet hours", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"), [
      {
        identifier: "old-z",
        content: { data: { zenNotificationKind: "weekly-practice-reminder" } },
      },
      { identifier: "session-alert", content: { data: { zenNotificationKind: "session-completion" } } },
      {
        identifier: "old-a",
        content: { data: { zenNotificationKind: "weekly-practice-reminder" } },
      },
      { identifier: "another-app-alert", content: { data: {} } },
    ]);
    const notifications = createLocalNotifications(nativeApi);

    const result = await notifications.rescheduleWeeklyReminders(
      preferences({
        remindersEnabled: true,
        selectedWeekdays: [1],
        quietHours: { startMinute: 0, endMinute: 6 * 60 },
        practiceTimes: [
          {
            id: "after-midnight",
            label: "After midnight",
            hour: 0,
            minute: 15,
            enabled: true,
            reminderLeadMinutes: 30,
          },
          {
            id: "quiet",
            label: "Quiet hours",
            hour: 5,
            minute: 30,
            enabled: true,
            reminderLeadMinutes: 0,
          },
          {
            id: "morning",
            label: "Morning",
            hour: 7,
            minute: 0,
            enabled: true,
            reminderLeadMinutes: 30,
          },
        ],
      }),
    );

    expect(result).toEqual({ permissionStatus: "granted", scheduledCount: 2 });
    expect(nativeApi.cancelled).toEqual(["old-a", "old-z"]);
    expect(nativeApi.requests).toEqual([
      {
        identifier: "zen.weekly-practice-reminder.1.2345",
        content: {
          title: "Zen",
          body: PRACTICE_REMINDER_BODY,
          sound: "default",
          data: { zenNotificationKind: "weekly-practice-reminder" },
        },
        trigger: {
          type: "weekly",
          channelId: "zen-practice-reminders",
          weekday: 1,
          hour: 23,
          minute: 45,
        },
      },
      {
        identifier: "zen.weekly-practice-reminder.2.0630",
        content: {
          title: "Zen",
          body: PRACTICE_REMINDER_BODY,
          sound: "default",
          data: { zenNotificationKind: "weekly-practice-reminder" },
        },
        trigger: {
          type: "weekly",
          channelId: "zen-practice-reminders",
          weekday: 2,
          hour: 6,
          minute: 30,
        },
      },
    ]);
    expect(nativeApi.scheduled.map((notification) => notification.identifier)).toEqual([
      "session-alert",
      "another-app-alert",
      "zen.weekly-practice-reminder.1.2345",
      "zen.weekly-practice-reminder.2.0630",
    ]);
  });

  it("removes stale reminders without throwing when device permission is denied", async () => {
    const nativeApi = new FakeNotificationsApi(permission("denied"), [
      {
        identifier: "old-reminder",
        content: { data: { zenNotificationKind: "weekly-practice-reminder" } },
      },
    ]);
    const notifications = createLocalNotifications(nativeApi);

    await expect(notifications.rescheduleWeeklyReminders(preferences({ remindersEnabled: true }))).resolves.toEqual({
      permissionStatus: "denied",
      scheduledCount: 0,
    });
    expect(nativeApi.cancelled).toEqual(["old-reminder"]);
    expect(nativeApi.requests).toEqual([]);
  });

  it("removes stale reminders when reminders are turned off", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"), [
      {
        identifier: "old-reminder",
        content: { data: { zenNotificationKind: "weekly-practice-reminder" } },
      },
    ]);
    const notifications = createLocalNotifications(nativeApi);

    await expect(notifications.rescheduleWeeklyReminders(preferences({ remindersEnabled: false }))).resolves.toEqual({
      permissionStatus: "granted",
      scheduledCount: 0,
    });
    expect(nativeApi.cancelled).toEqual(["old-reminder"]);
    expect(nativeApi.requests).toEqual([]);
  });

  it("schedules and cancels a session completion with its selected bundled sound", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"));
    const notifications = createLocalNotifications(nativeApi);

    await expect(
      notifications.scheduleSessionCompletion({
        sessionId: "session-42",
        scheduledAtMs: 1_800_000_000_000,
        sound: "low-bowl",
      }),
    ).resolves.toBe(true);

    expect(nativeApi.channels).toEqual([
      {
        id: "zen-session-completion.low-bowl",
        input: {
          name: "Session completion",
          importance: 5,
          sound: "low_bowl.wav",
          enableVibrate: false,
        },
      },
    ]);
    expect(nativeApi.requests).toEqual([
      {
        identifier: "zen.session-completion.session-42",
        content: {
          title: "Zen",
          body: "Your quiet pause is complete.",
          sound: "low_bowl.wav",
          data: { zenNotificationKind: "session-completion", sessionId: "session-42" },
        },
        trigger: {
          type: "date",
          channelId: "zen-session-completion.low-bowl",
          date: 1_800_000_000_000,
        },
      },
    ]);

    await notifications.cancelSessionCompletion("session-42");
    expect(nativeApi.cancelled).toEqual(["zen.session-completion.session-42"]);
    expect(nativeApi.scheduled).toEqual([]);
  });
});
