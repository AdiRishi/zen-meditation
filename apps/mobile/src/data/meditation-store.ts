import type { ActiveSession, AppPreferences, CompletedSession, CompletionSound, Feeling } from "@/domain/meditation";

export type StartSessionInput = {
  id: string;
  durationMinutes: number;
  startedAtMs: number;
  completionSound: CompletionSound;
};

export interface MeditationStore {
  loadPreferences(): Promise<AppPreferences>;
  savePreferences(preferences: AppPreferences): Promise<void>;
  loadActiveSession(): Promise<ActiveSession | null>;
  listCompletedSessions(): Promise<CompletedSession[]>;
  startSession(input: StartSessionInput): Promise<ActiveSession>;
  pauseActiveSession(nowMs: number): Promise<ActiveSession>;
  resumeActiveSession(nowMs: number): Promise<ActiveSession>;
  completeActiveSession(nowMs: number): Promise<CompletedSession | null>;
  abandonActiveSession(): Promise<void>;
  updateSessionFeeling(id: string, feeling: Feeling | null): Promise<void>;
  acknowledgeSession(id: string, acknowledgedAtMs: number): Promise<void>;
  resetAllData(): Promise<void>;
}

export function createSessionId(nowMs: number) {
  return `session-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
