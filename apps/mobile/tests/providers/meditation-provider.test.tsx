import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { InMemoryMeditationStore } from "@/data/in-memory-meditation-store";
import type { ActiveSession } from "@/domain/meditation";
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
    scheduleSessionCompletion: jest.fn(async (_notification) => true),
    cancelSessionCompletion: jest.fn(async (_sessionId) => undefined),
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
    expect(notifications.cancelSessionCompletion).toHaveBeenCalledWith("overdue-session");

    await act(async () => result.current.refresh());
    expect(result.current.completedSessions).toHaveLength(1);

    await act(async () => result.current.acknowledgeSession("overdue-session"));
    expect(result.current.pendingCompletion).toBeNull();
  });

  it("persists session transitions when notification delivery fails", async () => {
    const store = new InMemoryMeditationStore();
    const notifications = createNotifications();
    notifications.scheduleSessionCompletion.mockRejectedValue(new Error("Notifications unavailable"));
    notifications.cancelSessionCompletion.mockRejectedValue(new Error("Notifications unavailable"));
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
});
