import { useSQLiteContext } from "expo-sqlite";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
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
  resetAllData(): Promise<void>;
};

const MeditationContext = createContext<MeditationContextValue | null>(null);

type MeditationProviderProps = {
  children: React.ReactNode;
  store: MeditationStore;
  clock?: Clock;
};

function pendingCompletion(sessions: CompletedSession[]) {
  return sessions.find((session) => session.acknowledgedAtMs === null) ?? null;
}

export function MeditationProvider({ children, store, clock = systemClock }: MeditationProviderProps) {
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [state, setState] = useState<Omit<MeditationState, "reducedMotion">>({
    isReady: false,
    error: null,
    preferences: DEFAULT_PREFERENCES,
    activeSession: null,
    completedSessions: [],
    pendingCompletion: null,
  });

  const refresh = useCallback(async () => {
    try {
      const preferences = await store.loadPreferences();
      let activeSession = await store.loadActiveSession();

      if (activeSession && projectSession(activeSession, clock.now()).isComplete) {
        await store.completeActiveSession(clock.now());
        activeSession = await store.loadActiveSession();
      }

      const completedSessions = await store.listCompletedSessions();
      setState({
        isReady: true,
        error: null,
        preferences,
        activeSession,
        completedSessions,
        pendingCompletion: pendingCompletion(completedSessions),
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        isReady: true,
        error: error instanceof Error ? error : new Error("Local practice data is unavailable."),
      }));
    }
  }, [clock, store]);

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
      const value = appPreferencesSchema.parse(preferences);
      await store.savePreferences(value);
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
      setState((current) => ({ ...current, preferences, activeSession: session }));
      return session;
    },
    [clock, state.preferences, store],
  );

  const pauseActiveSession = useCallback(async () => {
    const session = await store.pauseActiveSession(clock.now());
    setState((current) => ({ ...current, activeSession: session }));
    return session;
  }, [clock, store]);

  const resumeActiveSession = useCallback(async () => {
    const session = await store.resumeActiveSession(clock.now());
    setState((current) => ({ ...current, activeSession: session }));
    return session;
  }, [clock, store]);

  const completeActiveSession = useCallback(async () => {
    const completed = await store.completeActiveSession(clock.now());
    const completedSessions = await store.listCompletedSessions();
    setState((current) => ({
      ...current,
      activeSession: null,
      completedSessions,
      pendingCompletion: pendingCompletion(completedSessions),
    }));
    return completed;
  }, [clock, store]);

  const abandonActiveSession = useCallback(async () => {
    await store.abandonActiveSession();
    setState((current) => ({ ...current, activeSession: null }));
  }, [store]);

  const setSessionFeeling = useCallback(
    async (id: string, feeling: Feeling | null) => {
      await store.updateSessionFeeling(id, feeling);
      const completedSessions = await store.listCompletedSessions();
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
    await refresh();
  }, [refresh, store]);

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
      resetAllData,
    }),
    [
      abandonActiveSession,
      acknowledgeSession,
      completeActiveSession,
      pauseActiveSession,
      refresh,
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
  return <MeditationProvider store={store}>{children}</MeditationProvider>;
}

export function useMeditation() {
  const context = use(MeditationContext);
  if (!context) {
    throw new Error("useMeditation must be used within MeditationProvider.");
  }
  return context;
}
