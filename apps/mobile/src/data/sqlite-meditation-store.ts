import type { SQLiteDatabase } from "expo-sqlite";

import {
  DEFAULT_PREFERENCES,
  activeSessionSchema,
  appPreferencesSchema,
  completedSessionSchema,
  type ActiveSession,
  type AppPreferences,
  type CompletedSession,
  type Feeling,
} from "@/domain/meditation";
import { completeSession, pauseSession, projectSession, resumeSession } from "@/domain/session-timer";

import type { MeditationStore, StartSessionInput } from "./meditation-store";

type ActiveSessionRow = {
  id: string;
  planned_duration_ms: number;
  started_at_ms: number;
  accumulated_active_ms: number;
  resumed_at_ms: number | null;
  status: "running" | "paused";
  completion_sound: ActiveSession["completionSound"];
};

type CompletedSessionRow = {
  id: string;
  started_at_ms: number;
  completed_at_ms: number;
  local_date: string;
  timezone_offset_minutes: number;
  duration_ms: number;
  completion_sound: CompletedSession["completionSound"];
  feeling: Feeling | null;
  acknowledged_at_ms: number | null;
};

function mapActiveSession(row: ActiveSessionRow) {
  return activeSessionSchema.parse({
    id: row.id,
    plannedDurationMs: row.planned_duration_ms,
    startedAtMs: row.started_at_ms,
    accumulatedActiveMs: row.accumulated_active_ms,
    resumedAtMs: row.resumed_at_ms,
    status: row.status,
    completionSound: row.completion_sound,
  });
}

function mapCompletedSession(row: CompletedSessionRow) {
  return completedSessionSchema.parse({
    id: row.id,
    startedAtMs: row.started_at_ms,
    completedAtMs: row.completed_at_ms,
    localDate: row.local_date,
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    durationMs: row.duration_ms,
    completionSound: row.completion_sound,
    feeling: row.feeling,
    acknowledgedAtMs: row.acknowledged_at_ms,
  });
}

export class SQLiteMeditationStore implements MeditationStore {
  constructor(private readonly db: SQLiteDatabase) {}

  async loadPreferences() {
    const row = await this.db.getFirstAsync<{ value: string }>("SELECT value FROM preferences WHERE singleton_id = 1");
    if (!row) {
      throw new Error("Local preferences are unavailable.");
    }
    return appPreferencesSchema.parse(JSON.parse(row.value));
  }

  async savePreferences(preferences: AppPreferences) {
    const value = appPreferencesSchema.parse(preferences);
    await this.db.runAsync(
      `INSERT INTO preferences (singleton_id, value) VALUES (1, ?)
       ON CONFLICT(singleton_id) DO UPDATE SET value = excluded.value`,
      JSON.stringify(value),
    );
  }

  async loadActiveSession() {
    const row = await this.db.getFirstAsync<ActiveSessionRow>(
      `SELECT id, planned_duration_ms, started_at_ms, accumulated_active_ms,
              resumed_at_ms, status, completion_sound
       FROM active_session WHERE singleton_id = 1`,
    );
    return row ? mapActiveSession(row) : null;
  }

  async listCompletedSessions() {
    const rows = await this.db.getAllAsync<CompletedSessionRow>(
      `SELECT id, started_at_ms, completed_at_ms, local_date, timezone_offset_minutes,
              duration_ms, completion_sound, feeling, acknowledged_at_ms
       FROM completed_sessions
       ORDER BY completed_at_ms DESC`,
    );
    return rows.map(mapCompletedSession);
  }

  async startSession(input: StartSessionInput) {
    const session = activeSessionSchema.parse({
      id: input.id,
      plannedDurationMs: input.durationMinutes * 60_000,
      startedAtMs: input.startedAtMs,
      accumulatedActiveMs: 0,
      resumedAtMs: input.startedAtMs,
      status: "running",
      completionSound: input.completionSound,
    });

    await this.db.runAsync(
      `INSERT INTO active_session (
         singleton_id, id, planned_duration_ms, started_at_ms,
         accumulated_active_ms, resumed_at_ms, status, completion_sound
       ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      session.id,
      session.plannedDurationMs,
      session.startedAtMs,
      session.accumulatedActiveMs,
      session.resumedAtMs,
      session.status,
      session.completionSound,
    );
    return session;
  }

  async pauseActiveSession(nowMs: number) {
    const current = await this.requireActiveSession();
    const next = pauseSession(current, nowMs);
    await this.saveActiveSession(next);
    return next;
  }

  async resumeActiveSession(nowMs: number) {
    const current = await this.requireActiveSession();
    const next = resumeSession(current, nowMs);
    await this.saveActiveSession(next);
    return next;
  }

  async completeActiveSession(nowMs: number) {
    let completed: CompletedSession | null = null;

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<ActiveSessionRow>(
        `SELECT id, planned_duration_ms, started_at_ms, accumulated_active_ms,
                resumed_at_ms, status, completion_sound
         FROM active_session WHERE singleton_id = 1`,
      );
      if (!row) {
        return;
      }

      const active = mapActiveSession(row);
      if (!projectSession(active, nowMs).isComplete) {
        throw new Error("A session cannot be completed while time remains.");
      }

      completed = completeSession(active, nowMs);
      await transaction.runAsync(
        `INSERT OR IGNORE INTO completed_sessions (
           id, started_at_ms, completed_at_ms, local_date, timezone_offset_minutes,
           duration_ms, completion_sound, feeling, acknowledged_at_ms
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        completed.id,
        completed.startedAtMs,
        completed.completedAtMs,
        completed.localDate,
        completed.timezoneOffsetMinutes,
        completed.durationMs,
        completed.completionSound,
        completed.feeling,
        completed.acknowledgedAtMs,
      );
      await transaction.runAsync("DELETE FROM active_session WHERE singleton_id = 1");
    });

    return completed;
  }

  async abandonActiveSession() {
    await this.db.runAsync("DELETE FROM active_session WHERE singleton_id = 1");
  }

  async updateSessionFeeling(id: string, feeling: Feeling | null) {
    const parsedFeeling = feeling === null ? null : completedSessionSchema.shape.feeling.parse(feeling);
    await this.db.runAsync("UPDATE completed_sessions SET feeling = ? WHERE id = ?", parsedFeeling, id);
  }

  async acknowledgeSession(id: string, acknowledgedAtMs: number) {
    await this.db.runAsync(
      "UPDATE completed_sessions SET acknowledged_at_ms = ? WHERE id = ? AND acknowledged_at_ms IS NULL",
      acknowledgedAtMs,
      id,
    );
  }

  async resetAllData() {
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync("DELETE FROM completed_sessions");
      await transaction.runAsync("DELETE FROM active_session");
      await transaction.runAsync("DELETE FROM preferences");
      await transaction.runAsync(
        "INSERT INTO preferences (singleton_id, value) VALUES (1, ?)",
        JSON.stringify(DEFAULT_PREFERENCES),
      );
    });
  }

  private async requireActiveSession() {
    const session = await this.loadActiveSession();
    if (!session) {
      throw new Error("No meditation session is active.");
    }
    return session;
  }

  private async saveActiveSession(session: ActiveSession) {
    const value = activeSessionSchema.parse(session);
    await this.db.runAsync(
      `UPDATE active_session
       SET accumulated_active_ms = ?, resumed_at_ms = ?, status = ?
       WHERE singleton_id = 1`,
      value.accumulatedActiveMs,
      value.resumedAtMs,
      value.status,
    );
  }
}
