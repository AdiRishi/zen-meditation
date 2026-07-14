import { useSQLiteContext } from "expo-sqlite";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { Uniwind } from "uniwind";

import type { MeditationStore } from "@/data/meditation-store";
import { SQLiteMeditationStore } from "@/data/sqlite-meditation-store";
import { createSessionId } from "@/domain/identifiers";
import {
  DEFAULT_PREFERENCES,
  type ActiveSession,
  type AppPreferences,
  type CompletedSession,
  type CompletionSound,
  type Feeling,
  type SessionDuration,
} from "@/domain/meditation";
import { projectSession } from "@/domain/session-timer";
import {
  localNotifications,
  type LocalNotificationPermissionStatus,
  type LocalNotifications,
} from "@/services/local-notifications";

export type Clock = {
  now(): number;
};

const systemClock: Clock = {
  now: Date.now,
};

type MeditationState = {
  isReady: boolean;
  error: Error | null;
  preferences: AppPreferences;
  activeSession: ActiveSession | null;
  completedSessions: CompletedSession[];
  pendingCompletion: CompletedSession | null;
  reducedMotion: boolean;
  notificationPermission: LocalNotificationPermissionStatus;
};

type MeditationContextValue = MeditationState & {
  refresh(): Promise<boolean>;
  savePreferences(preferences: AppPreferences): Promise<void>;
  startSession(durationMinutes: SessionDuration, completionSound?: CompletionSound): Promise<ActiveSession>;
  pauseSession(): Promise<ActiveSession>;
  resumeSession(): Promise<ActiveSession>;
  completeSession(): Promise<CompletedSession | null>;
  abandonSession(): Promise<void>;
  setSessionFeeling(id: string, feeling: Feeling | null): Promise<void>;
  acknowledgeSession(id: string): Promise<void>;
  saveReminderPreferences(
    preferences: AppPreferences,
    options?: { requestPermission?: boolean },
  ): Promise<ReminderPreferencesSaveResult>;
  resetAllData(): Promise<void>;
};

export type ReminderPreferencesSaveResult = {
  preferences: AppPreferences;
  scheduledCount: number;
  status: "disabled" | "no-scheduled-times" | "permission-denied" | "scheduled" | "sync-failed";
};

const MeditationContext = createContext<MeditationContextValue | null>(null);

type MeditationProviderProps = {
  children: React.ReactNode;
  store: MeditationStore;
  clock?: Clock;
  notifications?: LocalNotifications;
};

function pendingCompletion(sessions: CompletedSession[]) {
  return sessions.find((session) => session.acknowledgedAtMs === null) ?? null;
}

function sessionCompletionNotification(session: ActiveSession | null, nowMs: number) {
  if (!session || session.status !== "running") {
    return null;
  }

  return {
    sessionId: session.id,
    scheduledAtMs: nowMs + projectSession(session, nowMs).remainingMs,
    sound: session.completionSound,
  };
}

export function MeditationProvider({ children, store, clock = systemClock, notifications }: MeditationProviderProps) {
  const stateRevision = useRef(0);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [state, setState] = useState<Omit<MeditationState, "reducedMotion">>({
    isReady: false,
    error: null,
    preferences: DEFAULT_PREFERENCES,
    activeSession: null,
    completedSessions: [],
    pendingCompletion: null,
    notificationPermission: "undetermined",
  });

  const refresh = useCallback(async () => {
    while (true) {
      const refreshRevision = stateRevision.current;
      try {
        const preferences = await store.loadPreferences();
        let activeSession = await store.loadActiveSession();

        if (activeSession && projectSession(activeSession, clock.now()).isComplete) {
          await store.completeActiveSession(clock.now());
          activeSession = await store.loadActiveSession();
        }

        const [completedSessions, notificationPermission] = await Promise.all([
          store.listCompletedSessions(),
          notifications ? notifications.getPermissionStatus().catch(() => null) : Promise.resolve(null),
          notifications
            ? notifications
                .syncSessionCompletion(sessionCompletionNotification(activeSession, clock.now()))
                .catch(() => undefined)
            : Promise.resolve(),
        ]);
        if (refreshRevision !== stateRevision.current) {
          continue;
        }
        setState((current) => ({
          isReady: true,
          error: null,
          preferences,
          activeSession,
          completedSessions,
          pendingCompletion: pendingCompletion(completedSessions),
          notificationPermission: notificationPermission ?? current.notificationPermission,
        }));
        if (notifications) {
          void notifications.rescheduleWeeklyReminders(preferences).catch(() => undefined);
        }
        return true;
      } catch (error) {
        if (refreshRevision !== stateRevision.current) {
          continue;
        }
        setState((current) => ({
          ...current,
          isReady: true,
          error: error instanceof Error ? error : new Error("Local practice data is unavailable."),
        }));
        return false;
      }
    }
  }, [clock, notifications, store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReducedMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    if (state.isReady) {
      Uniwind.setTheme(state.preferences.appearance);
    }
  }, [state.isReady, state.preferences.appearance]);

  const savePreferences = useCallback(
    async (preferences: AppPreferences) => {
      await store.savePreferences(preferences);
      stateRevision.current += 1;
      setState((current) => ({ ...current, preferences }));
    },
    [store],
  );

  const saveReminderPreferences = useCallback(
    async (
      preferences: AppPreferences,
      { requestPermission = false }: { requestPermission?: boolean } = {},
    ): Promise<ReminderPreferencesSaveResult> => {
      const remindersRequested = preferences.remindersEnabled;
      let permission = state.notificationPermission;
      if (remindersRequested && permission !== "granted" && requestPermission) {
        permission = notifications ? await notifications.requestPermission() : "denied";
      }

      let effectivePreferences =
        remindersRequested && permission === "denied" ? { ...preferences, remindersEnabled: false } : preferences;
      await store.savePreferences(effectivePreferences);

      let schedulingResult;
      try {
        schedulingResult = notifications
          ? await notifications.rescheduleWeeklyReminders(effectivePreferences)
          : { permissionStatus: "denied" as const, scheduledCount: 0 };
      } catch {
        stateRevision.current += 1;
        setState((current) => ({
          ...current,
          preferences: effectivePreferences,
          notificationPermission: permission,
        }));
        return { preferences: effectivePreferences, scheduledCount: 0, status: "sync-failed" };
      }

      permission = schedulingResult.permissionStatus;
      if (effectivePreferences.remindersEnabled && permission !== "granted") {
        effectivePreferences = { ...effectivePreferences, remindersEnabled: false };
        await store.savePreferences(effectivePreferences);
        try {
          await notifications?.rescheduleWeeklyReminders(effectivePreferences);
        } catch {
          stateRevision.current += 1;
          setState((current) => ({
            ...current,
            preferences: effectivePreferences,
            notificationPermission: permission,
          }));
          return { preferences: effectivePreferences, scheduledCount: 0, status: "sync-failed" };
        }
      }

      stateRevision.current += 1;
      setState((current) => ({
        ...current,
        preferences: effectivePreferences,
        notificationPermission: permission,
      }));

      const status = !effectivePreferences.remindersEnabled
        ? remindersRequested
          ? "permission-denied"
          : "disabled"
        : schedulingResult.scheduledCount === 0
          ? "no-scheduled-times"
          : "scheduled";
      return {
        preferences: effectivePreferences,
        scheduledCount: schedulingResult.scheduledCount,
        status,
      };
    },
    [notifications, state.notificationPermission, store],
  );

  const startSession = useCallback(
    async (durationMinutes: SessionDuration, completionSound?: CompletionSound) => {
      const nowMs = clock.now();
      const sound = completionSound ?? state.preferences.completionSound;
      const preferences: AppPreferences = {
        ...state.preferences,
        lastDurationMinutes: durationMinutes,
        completionSound: sound,
      };
      const session = await store.startSession({
        id: createSessionId(),
        durationMinutes,
        startedAtMs: nowMs,
        completionSound: sound,
        preferences,
      });
      stateRevision.current += 1;
      setState((current) => ({ ...current, preferences, activeSession: session }));
      if (notifications) {
        await notifications.syncSessionCompletion(sessionCompletionNotification(session, nowMs)).catch(() => undefined);
      }
      return session;
    },
    [clock, notifications, state.preferences, store],
  );

  const pauseActiveSession = useCallback(async () => {
    const session = await store.pauseActiveSession(clock.now());
    stateRevision.current += 1;
    setState((current) => ({ ...current, activeSession: session }));
    if (notifications) {
      await notifications.syncSessionCompletion(null).catch(() => undefined);
    }
    return session;
  }, [clock, notifications, store]);

  const resumeActiveSession = useCallback(async () => {
    const nowMs = clock.now();
    const session = await store.resumeActiveSession(nowMs);
    stateRevision.current += 1;
    setState((current) => ({ ...current, activeSession: session }));
    if (notifications) {
      await notifications.syncSessionCompletion(sessionCompletionNotification(session, nowMs)).catch(() => undefined);
    }
    return session;
  }, [clock, notifications, store]);

  const completeActiveSession = useCallback(async () => {
    const activeSessionId = state.activeSession?.id;
    const completed = await store.completeActiveSession(clock.now());
    if (notifications) {
      await notifications.syncSessionCompletion(null).catch(() => undefined);
    }
    const completedSessions = await store.listCompletedSessions();
    stateRevision.current += 1;
    setState((current) => ({
      ...current,
      activeSession: null,
      completedSessions,
      pendingCompletion: pendingCompletion(completedSessions),
    }));
    return completed ?? completedSessions.find((session) => session.id === activeSessionId) ?? null;
  }, [clock, notifications, state.activeSession?.id, store]);

  const abandonActiveSession = useCallback(async () => {
    await store.abandonActiveSession();
    if (notifications) {
      await notifications.syncSessionCompletion(null).catch(() => undefined);
    }
    stateRevision.current += 1;
    setState((current) => ({ ...current, activeSession: null }));
  }, [notifications, store]);

  const setSessionFeeling = useCallback(
    async (id: string, feeling: Feeling | null) => {
      await store.updateSessionFeeling(id, feeling);
      const completedSessions = await store.listCompletedSessions();
      stateRevision.current += 1;
      setState((current) => ({
        ...current,
        completedSessions,
        pendingCompletion: pendingCompletion(completedSessions),
      }));
    },
    [store],
  );

  const acknowledgeSession = useCallback(
    async (id: string) => {
      await store.acknowledgeSession(id, clock.now());
      const completedSessions = await store.listCompletedSessions();
      stateRevision.current += 1;
      setState((current) => ({
        ...current,
        completedSessions,
        pendingCompletion: pendingCompletion(completedSessions),
      }));
    },
    [clock, store],
  );

  const resetAllData = useCallback(async () => {
    await store.resetAllData();
    stateRevision.current += 1;
    if (notifications) {
      await notifications.clearAllManagedNotifications().catch(() => undefined);
    }
    await refresh();
  }, [notifications, refresh, store]);

  const value: MeditationContextValue = {
    ...state,
    reducedMotion: state.preferences.reducedMotion || systemReducedMotion,
    refresh,
    savePreferences,
    startSession,
    pauseSession: pauseActiveSession,
    resumeSession: resumeActiveSession,
    completeSession: completeActiveSession,
    abandonSession: abandonActiveSession,
    setSessionFeeling,
    acknowledgeSession,
    saveReminderPreferences,
    resetAllData,
  };

  return <MeditationContext value={value}>{children}</MeditationContext>;
}

export function SQLiteMeditationProvider({ children }: { children: React.ReactNode }) {
  const database = useSQLiteContext();
  const store = useMemo(() => new SQLiteMeditationStore(database), [database]);
  return (
    <MeditationProvider store={store} notifications={localNotifications}>
      {children}
    </MeditationProvider>
  );
}

export function useMeditation() {
  const context = use(MeditationContext);
  if (!context) {
    throw new Error("useMeditation must be used within MeditationProvider.");
  }
  return context;
}
