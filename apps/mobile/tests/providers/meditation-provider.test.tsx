import { act, renderHook, waitFor } from "@testing-library/react-native";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import type { ReactNode } from "react";

import { DEFAULT_PREFERENCES, type ActiveSession } from "@/domain/meditation";
import { MeditationProvider, useMeditation, type Clock } from "@/providers/meditation-provider";
import type { LocalNotifications } from "@/services/local-notifications";

const STARTED_AT_MS = new Date(2026, 6, 13, 7, 0).getTime();

function createClock(nowMs: number): Clock {
  return { now: () => nowMs };
}

function createNotifications(): jest.Mocked<LocalNotifications> {
  return {
    getPermissionStatus: jest.fn(async () => "granted"),
    requestPermission: jest.fn(async () => "granted"),
    rescheduleWeeklyReminders: jest.fn(async (_preferences) => ({
      permissionStatus: "granted" as const,
      scheduledCount: 0,
    })),
    syncSessionCompletion: jest.fn(async (_notification) => true),
    clearAllManagedNotifications: jest.fn(async () => undefined),
  };
}

function createWrapper({
  store,
  clock,
  notifications,
}: {
  store: InMemoryMeditationStore;
  clock: Clock;
  notifications: LocalNotifications;
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MeditationProvider store={store} clock={clock} notifications={notifications}>
        {children}
      </MeditationProvider>
    );
  };
}

describe("MeditationProvider", () => {
  it("recovers an overdue session exactly once and keeps it pending until acknowledgment", async () => {
    const activeSession: ActiveSession = {
      id: "overdue-session",
      plannedDurationMs: 5 * 60_000,
      startedAtMs: STARTED_AT_MS,
      accumulatedActiveMs: 0,
      resumedAtMs: STARTED_AT_MS,
      status: "running",
      completionSound: "soft-chime",
      completionLocalDate: "2026-07-13",
      completionTimezoneOffsetMinutes: new Date(STARTED_AT_MS + 5 * 60_000).getTimezoneOffset(),
    };
    const store = new InMemoryMeditationStore({ activeSession });
    const notifications = createNotifications();
    const wrapper = createWrapper({
      store,
      clock: createClock(STARTED_AT_MS + 6 * 60_000),
      notifications,
    });
    const { result } = renderHook(useMeditation, { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.activeSession).toBeNull();
    expect(result.current.completedSessions).toHaveLength(1);
    expect(result.current.pendingCompletion?.id).toBe("overdue-session");
    expect(notifications.syncSessionCompletion).toHaveBeenCalledWith(null);

    await act(async () => result.current.refresh());
    expect(result.current.completedSessions).toHaveLength(1);

    await act(async () => result.current.acknowledgeSession("overdue-session"));
    expect(result.current.pendingCompletion).toBeNull();
  });

  it("persists session transitions when notification delivery fails", async () => {
    const store = new InMemoryMeditationStore();
    const notifications = createNotifications();
    notifications.syncSessionCompletion.mockRejectedValue(new Error("Notifications unavailable"));
    const wrapper = createWrapper({ store, clock: createClock(STARTED_AT_MS), notifications });
    const { result } = renderHook(useMeditation, { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(async () => {
      await result.current.startSession(5);
    });
    await expect(store.loadActiveSession()).resolves.toMatchObject({ status: "running" });

    await act(async () => {
      await result.current.pauseSession();
    });
    await expect(store.loadActiveSession()).resolves.toMatchObject({ status: "paused" });

    await act(async () => {
      await result.current.resumeSession();
    });
    await expect(store.loadActiveSession()).resolves.toMatchObject({ status: "running" });

    await act(async () => {
      await result.current.abandonSession();
    });
    await expect(store.loadActiveSession()).resolves.toBeNull();
  });

  it("does not let an older refresh overwrite a newer session transition", async () => {
    const store = new InMemoryMeditationStore();
    const notifications = createNotifications();
    let resolvePermission: ((permission: "granted") => void) | undefined;
    notifications.getPermissionStatus
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePermission = resolve;
          }),
      )
      .mockResolvedValue("granted");
    const wrapper = createWrapper({ store, clock: createClock(STARTED_AT_MS), notifications });
    const { result } = renderHook(useMeditation, { wrapper });

    await act(async () => {
      await result.current.startSession(5);
    });
    expect(result.current.activeSession).toMatchObject({ status: "running" });

    await act(async () => resolvePermission?.("granted"));
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.activeSession).toMatchObject({ status: "running" });
    await expect(store.loadActiveSession()).resolves.toMatchObject({ status: "running" });
  });

  it("loads session history while independent notification checks are in flight", async () => {
    class ObservableSessionStore extends InMemoryMeditationStore {
      listCalls = 0;

      override async listCompletedSessions() {
        this.listCalls += 1;
        return super.listCompletedSessions();
      }
    }

    const store = new ObservableSessionStore();
    const notifications = createNotifications();
    let resolvePermission: ((permission: "granted") => void) | undefined;
    let resolveSync: (() => void) | undefined;
    notifications.getPermissionStatus.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
    );
    notifications.syncSessionCompletion.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSync = () => resolve(true);
        }),
    );
    const wrapper = createWrapper({ store, clock: createClock(STARTED_AT_MS), notifications });
    const { result } = renderHook(useMeditation, { wrapper });

    await waitFor(() => expect(store.listCalls).toBe(1));
    expect(result.current.isReady).toBe(false);

    await act(async () => {
      resolvePermission?.("granted");
      resolveSync?.();
    });
    await waitFor(() => expect(result.current.isReady).toBe(true));
  });

  it("returns the completed session when another local writer wins completion", async () => {
    let nowMs = STARTED_AT_MS;
    const store = new InMemoryMeditationStore();
    const notifications = createNotifications();
    const wrapper = createWrapper({ store, clock: { now: () => nowMs }, notifications });
    const { result } = renderHook(useMeditation, { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(async () => {
      await result.current.startSession(5);
    });
    nowMs += 5 * 60_000;
    await store.completeActiveSession(nowMs);

    let completed;
    await act(async () => {
      completed = await result.current.completeSession();
    });

    expect(completed).toMatchObject({ id: result.current.pendingCompletion?.id });
  });

  it("reconciles reminders again after a later refresh", async () => {
    const store = new InMemoryMeditationStore();
    const notifications = createNotifications();
    notifications.rescheduleWeeklyReminders
      .mockRejectedValueOnce(new Error("Scheduling unavailable"))
      .mockResolvedValue({ permissionStatus: "granted", scheduledCount: 0 });
    const wrapper = createWrapper({ store, clock: createClock(STARTED_AT_MS), notifications });
    const { result } = renderHook(useMeditation, { wrapper });

    await waitFor(() => expect(notifications.rescheduleWeeklyReminders).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(notifications.rescheduleWeeklyReminders).toHaveBeenCalledTimes(2));
  });

  it("keeps a load error visible until a complete refresh succeeds", async () => {
    class RecoverableSessionStore extends InMemoryMeditationStore {
      shouldFail = true;

      override async loadActiveSession() {
        if (this.shouldFail) {
          throw new Error("Stored session is corrupt");
        }
        return super.loadActiveSession();
      }
    }

    const store = new RecoverableSessionStore();
    const notifications = createNotifications();
    const wrapper = createWrapper({ store, clock: createClock(STARTED_AT_MS), notifications });
    const { result } = renderHook(useMeditation, { wrapper });

    await waitFor(() => expect(result.current.error?.message).toBe("Stored session is corrupt"));
    await act(async () => result.current.savePreferences({ ...DEFAULT_PREFERENCES, appearance: "dark" }));
    expect(result.current.error?.message).toBe("Stored session is corrupt");

    store.shouldFail = false;
    await act(async () => result.current.refresh());
    expect(result.current.error).toBeNull();
  });

  it("can reset unreadable session data and clear orphaned notifications", async () => {
    class CorruptSessionStore extends InMemoryMeditationStore {
      private shouldFail = true;

      override async loadActiveSession() {
        if (this.shouldFail) {
          this.shouldFail = false;
          throw new Error("Stored session is corrupt");
        }
        return super.loadActiveSession();
      }
    }

    const store = new CorruptSessionStore();
    const notifications = createNotifications();
    const wrapper = createWrapper({ store, clock: createClock(STARTED_AT_MS), notifications });
    const { result } = renderHook(useMeditation, { wrapper });

    await waitFor(() => expect(result.current.error?.message).toBe("Stored session is corrupt"));
    await act(async () => result.current.resetAllData());

    expect(result.current.error).toBeNull();
    expect(notifications.clearAllManagedNotifications).toHaveBeenCalledTimes(1);
    await expect(store.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });
});
