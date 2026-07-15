import type {
  NotificationChannelInput,
  NotificationPermissionsRequest,
  NotificationPermissionsStatus,
  NotificationRequestInput,
} from "expo-notifications";

import { DEFAULT_PREFERENCES, type AppPreferences } from "@/domain/meditation";
import {
  createLocalNotifications,
  getMossNotificationKind,
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
  permissionError: Error | null = null;
  scheduleFailureAt: number | null = null;
  scheduleGate: Promise<void> | null = null;
  scheduleGateAt: number | null = null;
  onScheduleAttempt: (() => void) | null = null;
  private scheduleAttempts = 0;

  constructor(currentPermission: NotificationPermissionsStatus, scheduled: ScheduledNotification[] = []) {
    this.permission = currentPermission;
    this.requestedPermission = currentPermission;
    this.scheduled = scheduled;
  }

  async getPermissionsAsync() {
    if (this.permissionError) {
      throw this.permissionError;
    }
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
    this.scheduleAttempts += 1;
    this.onScheduleAttempt?.();
    if (this.scheduleAttempts === this.scheduleFailureAt) {
      throw new Error("Scheduling unavailable");
    }
    if (this.scheduleAttempts === this.scheduleGateAt) {
      await this.scheduleGate;
    }
    const identifier = request.identifier ?? `notification-${this.requests.length + 1}`;
    this.requests.push(request);
    this.scheduled = this.scheduled.filter((notification) => notification.identifier !== identifier);
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
  it("recognizes only notification responses owned by Moss", () => {
    expect(getMossNotificationKind({ mossNotificationKind: "weekly-practice-reminder" })).toBe(
      "weekly-practice-reminder",
    );
    expect(getMossNotificationKind({ mossNotificationKind: "session-completion" })).toBe("session-completion");
    expect(getMossNotificationKind({ mossNotificationKind: "something-else" })).toBeNull();
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

  it("requests only the alert and sound access used by Moss reminders", async () => {
    const nativeApi = new FakeNotificationsApi(permission("undetermined"));
    nativeApi.requestedPermission = permission("denied");
    const notifications = createLocalNotifications(nativeApi);

    await expect(notifications.requestPermission()).resolves.toBe("denied");
    expect(nativeApi.permissionRequest).toEqual({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
      android: {},
    });
  });

  it("replaces Moss reminders with deterministic weekly triggers outside quiet hours", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"), [
      {
        identifier: "old-z",
        content: { data: { mossNotificationKind: "weekly-practice-reminder" } },
      },
      { identifier: "session-alert", content: { data: { mossNotificationKind: "session-completion" } } },
      {
        identifier: "old-a",
        content: { data: { mossNotificationKind: "weekly-practice-reminder" } },
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
        identifier: "moss.weekly-practice-reminder.1.2345",
        content: {
          title: "Moss",
          body: PRACTICE_REMINDER_BODY,
          sound: "default",
          data: { mossNotificationKind: "weekly-practice-reminder" },
        },
        trigger: {
          type: "weekly",
          channelId: "moss-practice-reminders",
          weekday: 1,
          hour: 23,
          minute: 45,
        },
      },
      {
        identifier: "moss.weekly-practice-reminder.2.0630",
        content: {
          title: "Moss",
          body: PRACTICE_REMINDER_BODY,
          sound: "default",
          data: { mossNotificationKind: "weekly-practice-reminder" },
        },
        trigger: {
          type: "weekly",
          channelId: "moss-practice-reminders",
          weekday: 2,
          hour: 6,
          minute: 30,
        },
      },
    ]);
    expect(nativeApi.scheduled.map((notification) => notification.identifier)).toEqual([
      "session-alert",
      "another-app-alert",
      "moss.weekly-practice-reminder.1.2345",
      "moss.weekly-practice-reminder.2.0630",
    ]);
  });

  it("removes stale reminders without throwing when device permission is denied", async () => {
    const nativeApi = new FakeNotificationsApi(permission("denied"), [
      {
        identifier: "old-reminder",
        content: { data: { mossNotificationKind: "weekly-practice-reminder" } },
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
        content: { data: { mossNotificationKind: "weekly-practice-reminder" } },
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

  it("reconciles a session completion with its selected bundled sound", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"));
    const notifications = createLocalNotifications(nativeApi);

    await expect(
      notifications.syncSessionCompletion({
        sessionId: "session-42",
        scheduledAtMs: 1_800_000_000_000,
        sound: "low-bowl",
      }),
    ).resolves.toBe(true);

    expect(nativeApi.channels).toEqual([
      {
        id: "moss-session-completion.low-bowl",
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
        identifier: "moss.session-completion.session-42",
        content: {
          title: "Moss",
          body: "Your quiet pause is complete.",
          sound: "low_bowl.wav",
          data: {
            mossNotificationKind: "session-completion",
            sessionId: "session-42",
            scheduledAtMs: 1_800_000_000_000,
            sound: "low-bowl",
          },
        },
        trigger: {
          type: "date",
          channelId: "moss-session-completion.low-bowl",
          date: 1_800_000_000_000,
        },
      },
    ]);

    await notifications.syncSessionCompletion(null);
    expect(nativeApi.cancelled).toEqual(["moss.session-completion.session-42"]);
    expect(nativeApi.scheduled).toEqual([]);
  });

  it("rolls back a partial weekly reminder replacement without touching other notifications", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"), [
      {
        identifier: "old-weekly",
        content: { data: { mossNotificationKind: "weekly-practice-reminder" } },
      },
      {
        identifier: "active-session",
        content: { data: { mossNotificationKind: "session-completion" } },
      },
      { identifier: "another-app", content: { data: {} } },
    ]);
    nativeApi.scheduleFailureAt = 2;
    const notifications = createLocalNotifications(nativeApi);

    await expect(
      notifications.rescheduleWeeklyReminders(
        preferences({
          remindersEnabled: true,
          selectedWeekdays: [1, 2],
          quietHours: { startMinute: 0, endMinute: 0 },
          practiceTimes: [DEFAULT_PREFERENCES.practiceTimes[0]],
        }),
      ),
    ).rejects.toThrow("Scheduling unavailable");

    expect(nativeApi.cancelled).toEqual(["moss.weekly-practice-reminder.2.0650"]);
    expect(nativeApi.scheduled.map((notification) => notification.identifier)).toEqual([
      "old-weekly",
      "active-session",
      "another-app",
    ]);
  });

  it("clears every Moss-owned notification while preserving other apps", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"), [
      {
        identifier: "weekly",
        content: { data: { mossNotificationKind: "weekly-practice-reminder" } },
      },
      {
        identifier: "session",
        content: { data: { mossNotificationKind: "session-completion" } },
      },
      { identifier: "another-app", content: { data: {} } },
    ]);

    await createLocalNotifications(nativeApi).clearAllManagedNotifications();

    expect(nativeApi.cancelled).toEqual(["session", "weekly"]);
    expect(nativeApi.scheduled.map((notification) => notification.identifier)).toEqual(["another-app"]);
  });

  it("serializes overlapping reminder replacements so the latest plan wins", async () => {
    let releaseFirstSchedule: (() => void) | undefined;
    let signalFirstScheduleStarted: (() => void) | undefined;
    const nativeApi = new FakeNotificationsApi(permission("granted"));
    const firstScheduleStarted = new Promise<void>((resolve) => {
      signalFirstScheduleStarted = resolve;
    });
    nativeApi.onScheduleAttempt = () => signalFirstScheduleStarted?.();
    nativeApi.scheduleGateAt = 1;
    nativeApi.scheduleGate = new Promise((resolve) => {
      releaseFirstSchedule = resolve;
    });
    const notifications = createLocalNotifications(nativeApi);
    const monday = preferences({
      remindersEnabled: true,
      selectedWeekdays: [1],
      quietHours: { startMinute: 0, endMinute: 0 },
      practiceTimes: [DEFAULT_PREFERENCES.practiceTimes[0]],
    });
    const tuesday = preferences({
      remindersEnabled: true,
      selectedWeekdays: [2],
      quietHours: { startMinute: 0, endMinute: 0 },
      practiceTimes: [DEFAULT_PREFERENCES.practiceTimes[0]],
    });

    const firstUpdate = notifications.rescheduleWeeklyReminders(monday);
    await firstScheduleStarted;
    const secondUpdate = notifications.rescheduleWeeklyReminders(tuesday);

    releaseFirstSchedule?.();
    await Promise.all([firstUpdate, secondUpdate]);

    expect(nativeApi.scheduled.map((notification) => notification.identifier)).toEqual([
      "moss.weekly-practice-reminder.3.0650",
    ]);
  });

  it("preserves a matching session alarm when notification services are temporarily unavailable", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"), [
      {
        identifier: "moss.session-completion.session-42",
        content: {
          data: {
            mossNotificationKind: "session-completion",
            sessionId: "session-42",
            scheduledAtMs: 1_800_000_000_000,
            sound: "low-bowl",
          },
        },
      },
    ]);
    nativeApi.permissionError = new Error("Notification service unavailable");

    await expect(
      createLocalNotifications(nativeApi).syncSessionCompletion({
        sessionId: "session-42",
        scheduledAtMs: 1_800_000_000_000,
        sound: "low-bowl",
      }),
    ).resolves.toBe(true);

    expect(nativeApi.cancelled).toEqual([]);
    expect(nativeApi.scheduled).toHaveLength(1);
  });

  it("replaces a stale completion alarm when a resumed session moves its deadline", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"), [
      {
        identifier: "moss.session-completion.session-42",
        content: {
          data: {
            mossNotificationKind: "session-completion",
            sessionId: "session-42",
            scheduledAtMs: 1_800_000_000_000,
            sound: "low-bowl",
          },
        },
      },
    ]);

    await expect(
      createLocalNotifications(nativeApi).syncSessionCompletion({
        sessionId: "session-42",
        scheduledAtMs: 1_800_000_300_000,
        sound: "wood-tone",
      }),
    ).resolves.toBe(true);

    expect(nativeApi.requests).toHaveLength(1);
    expect(nativeApi.scheduled).toEqual([
      {
        identifier: "moss.session-completion.session-42",
        content: {
          data: {
            mossNotificationKind: "session-completion",
            sessionId: "session-42",
            scheduledAtMs: 1_800_000_300_000,
            sound: "wood-tone",
          },
        },
      },
    ]);
  });

  it("removes a stale completion alarm when its replacement cannot be scheduled", async () => {
    const nativeApi = new FakeNotificationsApi(permission("granted"), [
      {
        identifier: "moss.session-completion.session-42",
        content: {
          data: {
            mossNotificationKind: "session-completion",
            sessionId: "session-42",
            scheduledAtMs: 1_800_000_000_000,
            sound: "low-bowl",
          },
        },
      },
    ]);
    nativeApi.scheduleFailureAt = 1;

    await expect(
      createLocalNotifications(nativeApi).syncSessionCompletion({
        sessionId: "session-42",
        scheduledAtMs: 1_800_000_300_000,
        sound: "low-bowl",
      }),
    ).rejects.toThrow("Scheduling unavailable");

    expect(nativeApi.cancelled).toEqual(["moss.session-completion.session-42"]);
    expect(nativeApi.scheduled).toEqual([]);
  });
});
