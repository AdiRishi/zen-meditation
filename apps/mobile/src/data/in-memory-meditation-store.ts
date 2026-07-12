import {
  DEFAULT_PREFERENCES,
  activeSessionSchema,
  appPreferencesSchema,
  type ActiveSession,
  type AppPreferences,
  type CompletedSession,
  type Feeling,
} from "@/domain/meditation";
import { completeSession, pauseSession, projectSession, resumeSession } from "@/domain/session-timer";

import type { MeditationStore, StartSessionInput } from "./meditation-store";

type InMemoryMeditationStoreState = {
  preferences?: AppPreferences;
  activeSession?: ActiveSession | null;
  completedSessions?: CompletedSession[];
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class InMemoryMeditationStore implements MeditationStore {
  private preferences: AppPreferences;
  private activeSession: ActiveSession | null;
  private completedSessions: CompletedSession[];

  constructor(state: InMemoryMeditationStoreState = {}) {
    this.preferences = appPreferencesSchema.parse(clone(state.preferences ?? DEFAULT_PREFERENCES));
    this.activeSession = state.activeSession ? activeSessionSchema.parse(clone(state.activeSession)) : null;
    this.completedSessions = clone(state.completedSessions ?? []);
  }

  async loadPreferences() {
    return clone(this.preferences);
  }

  async savePreferences(preferences: AppPreferences) {
    this.preferences = appPreferencesSchema.parse(clone(preferences));
  }

  async loadActiveSession() {
    return clone(this.activeSession);
  }

  async listCompletedSessions() {
    return clone(this.completedSessions).sort((left, right) => right.completedAtMs - left.completedAtMs);
  }

  async startSession(input: StartSessionInput) {
    if (this.activeSession) {
      throw new Error("A meditation session is already active.");
    }

    this.activeSession = activeSessionSchema.parse({
      id: input.id,
      plannedDurationMs: input.durationMinutes * 60_000,
      startedAtMs: input.startedAtMs,
      accumulatedActiveMs: 0,
      resumedAtMs: input.startedAtMs,
      status: "running",
      completionSound: input.completionSound,
    });
    return clone(this.activeSession);
  }

  async pauseActiveSession(nowMs: number) {
    this.activeSession = pauseSession(this.requireActiveSession(), nowMs);
    return clone(this.activeSession);
  }

  async resumeActiveSession(nowMs: number) {
    this.activeSession = resumeSession(this.requireActiveSession(), nowMs);
    return clone(this.activeSession);
  }

  async completeActiveSession(nowMs: number) {
    if (!this.activeSession) {
      return null;
    }
    if (!projectSession(this.activeSession, nowMs).isComplete) {
      throw new Error("A session cannot be completed while time remains.");
    }

    const completed = completeSession(this.activeSession, nowMs);
    if (!this.completedSessions.some((session) => session.id === completed.id)) {
      this.completedSessions.push(completed);
    }
    this.activeSession = null;
    return clone(completed);
  }

  async abandonActiveSession() {
    this.activeSession = null;
  }

  async updateSessionFeeling(id: string, feeling: Feeling | null) {
    this.completedSessions = this.completedSessions.map((session) =>
      session.id === id ? { ...session, feeling } : session,
    );
  }

  async acknowledgeSession(id: string, acknowledgedAtMs: number) {
    this.completedSessions = this.completedSessions.map((session) =>
      session.id === id && session.acknowledgedAtMs === null ? { ...session, acknowledgedAtMs } : session,
    );
  }

  async resetAllData() {
    this.preferences = clone(DEFAULT_PREFERENCES);
    this.activeSession = null;
    this.completedSessions = [];
  }

  private requireActiveSession() {
    if (!this.activeSession) {
      throw new Error("No meditation session is active.");
    }
    return this.activeSession;
  }
}
