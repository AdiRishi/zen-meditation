import { useSQLiteContext } from "expo-sqlite";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { Uniwind } from "uniwind";

import type { MeditationStore } from "@/data/meditation-store";
import { createSessionId } from "@/data/meditation-store";
import { SQLiteMeditationStore } from "@/data/sqlite-meditation-store";
import {
  DEFAULT_PREFERENCES,
  appPreferencesSchema,
  type ActiveSession,
  type AppPreferences,
  type CompletedSession,
  type CompletionSound,
  type Feeling,
} from "@/domain/meditation";
import { projectSession } from "@/domain/session-timer";
import {
  localNotifications,
  type LocalNotificationPermissionStatus,
  type LocalNotifications,
  type ReminderSchedulingResult,
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
  refresh(): Promise<void>;
  savePreferences(preferences: AppPreferences): Promise<void>;
  startSession(durationMinutes: number, completionSound?: CompletionSound): Promise<ActiveSession>;
  pauseSession(): Promise<ActiveSession>;
  resumeSession(): Promise<ActiveSession>;
  completeSession(): Promise<CompletedSession | null>;
  abandonSession(): Promise<void>;
  setSessionFeeling(id: string, feeling: Feeling | null): Promise<void>;
  acknowledgeSession(id: string): Promise<void>;
  requestReminderPermission(): Promise<LocalNotificationPermissionStatus>;
  rescheduleReminders(preferences?: AppPreferences): Promise<ReminderSchedulingResult>;
  resetAllData(): Promise<void>;
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

export function MeditationProvider({ children, store, clock = systemClock, notifications }: MeditationProviderProps) {
  const stateRevision = useRef(0);
  const initialReminderSyncComplete = useRef(false);
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
          const completedSessionId = activeSession.id;
          await store.completeActiveSession(clock.now());
          if (notifications) {
            await notifications.cancelSessionCompletion(completedSessionId).catch(() => undefined);
          }
          activeSession = await store.loadActiveSession();
        }

        const completedSessions = await store.listCompletedSessions();
        const notificationPermission = notifications
          ? await notifications.getPermissionStatus().catch(() => "denied" as const)
          : "undetermined";
        if (refreshRevision !== stateRevision.current) {
          continue;
        }
        setState({
          isReady: true,
          error: null,
          preferences,
          activeSession,
          completedSessions,
          pendingCompletion: pendingCompletion(completedSessions),
          notificationPermission,
        });
        return;
      } catch (error) {
        if (refreshRevision !== stateRevision.current) {
          continue;
        }
        setState((current) => ({
          ...current,
          isReady: true,
          error: error instanceof Error ? error : new Error("Local practice data is unavailable."),
        }));
        return;
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

  useEffect(() => {
    if (!notifications || !state.isReady || initialReminderSyncComplete.current) {
      return;
    }
    initialReminderSyncComplete.current = true;
    void notifications.rescheduleWeeklyReminders(state.preferences).catch(() => undefined);
  }, [notifications, state.isReady, state.preferences]);

  const savePreferences = useCallback(
    async (preferences: AppPreferences) => {
      const value = appPreferencesSchema.parse(preferences);
      await store.savePreferences(value);
      stateRevision.current += 1;
      setState((current) => ({ ...current, error: null, preferences: value }));
    },
    [store],
  );

  const startSession = useCallback(
    async (durationMinutes: number, completionSound?: CompletionSound) => {
      const nowMs = clock.now();
      const sound = completionSound ?? state.preferences.completionSound;
      const session = await store.startSession({
        id: createSessionId(nowMs),
        durationMinutes,
        startedAtMs: nowMs,
        completionSound: sound,
      });
      const preferences = {
        ...state.preferences,
        lastDurationMinutes: durationMinutes,
        completionSound: sound,
      } as AppPreferences;
      await store.savePreferences(preferences);
      stateRevision.current += 1;
      setState((current) => ({ ...current, preferences, activeSession: session }));
      if (notifications) {
        void notifications
          .scheduleSessionCompletion({
            sessionId: session.id,
            scheduledAtMs: nowMs + session.plannedDurationMs,
            sound: session.completionSound,
          })
          .catch(() => undefined);
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
      void notifications.cancelSessionCompletion(session.id).catch(() => undefined);
    }
    return session;
  }, [clock, notifications, store]);

  const resumeActiveSession = useCallback(async () => {
    const nowMs = clock.now();
    const session = await store.resumeActiveSession(nowMs);
    stateRevision.current += 1;
    setState((current) => ({ ...current, activeSession: session }));
    if (notifications) {
      void notifications
        .scheduleSessionCompletion({
          sessionId: session.id,
          scheduledAtMs: nowMs + projectSession(session, nowMs).remainingMs,
          sound: session.completionSound,
        })
        .catch(() => undefined);
    }
    return session;
  }, [clock, notifications, store]);

  const completeActiveSession = useCallback(async () => {
    const activeSession = await store.loadActiveSession();
    const completed = await store.completeActiveSession(clock.now());
    if (activeSession && notifications) {
      void notifications.cancelSessionCompletion(activeSession.id).catch(() => undefined);
    }
    const completedSessions = await store.listCompletedSessions();
    stateRevision.current += 1;
    setState((current) => ({
      ...current,
      activeSession: null,
      completedSessions,
      pendingCompletion: pendingCompletion(completedSessions),
    }));
    return completed;
  }, [clock, notifications, store]);

  const abandonActiveSession = useCallback(async () => {
    const activeSession = await store.loadActiveSession();
    await store.abandonActiveSession();
    if (activeSession && notifications) {
      void notifications.cancelSessionCompletion(activeSession.id).catch(() => undefined);
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
    const activeSession = await store.loadActiveSession();
    if (activeSession && notifications) {
      await notifications.cancelSessionCompletion(activeSession.id).catch(() => undefined);
    }
    await store.resetAllData();
    stateRevision.current += 1;
    if (notifications) {
      await notifications.rescheduleWeeklyReminders(DEFAULT_PREFERENCES).catch(() => undefined);
    }
    await refresh();
  }, [notifications, refresh, store]);

  const requestReminderPermission = useCallback(async () => {
    const permission = notifications ? await notifications.requestPermission() : "denied";
    stateRevision.current += 1;
    setState((current) => ({ ...current, notificationPermission: permission }));
    return permission;
  }, [notifications]);

  const rescheduleReminders = useCallback(
    async (preferences = state.preferences) => {
      if (!notifications) {
        return { permissionStatus: "denied", scheduledCount: 0 } as const;
      }
      const result = await notifications.rescheduleWeeklyReminders(preferences);
      stateRevision.current += 1;
      setState((current) => ({ ...current, notificationPermission: result.permissionStatus }));
      return result;
    },
    [notifications, state.preferences],
  );

  const value = useMemo<MeditationContextValue>(
    () => ({
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
      requestReminderPermission,
      rescheduleReminders,
      resetAllData,
    }),
    [
      abandonActiveSession,
      acknowledgeSession,
      completeActiveSession,
      pauseActiveSession,
      refresh,
      requestReminderPermission,
      rescheduleReminders,
      resetAllData,
      resumeActiveSession,
      savePreferences,
      setSessionFeeling,
      startSession,
      state,
      systemReducedMotion,
    ],
  );

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
