import type { SQLiteDatabase } from "expo-sqlite";

import { toLocalDateKey } from "@/domain/date-time";
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
import {
  completeSession,
  createActiveSession,
  pauseSession,
  projectSession,
  resumeSession,
} from "@/domain/session-timer";
import { SerialTaskQueue } from "@/lib/serial-task-queue";

import type { MeditationStore, StartSessionInput } from "./meditation-store";

type ActiveSessionRow = {
  id: string;
  planned_duration_ms: number;
  started_at_ms: number;
  accumulated_active_ms: number;
  resumed_at_ms: number | null;
  status: "running" | "paused";
  completion_sound: ActiveSession["completionSound"];
  completion_local_date: string | null;
  completion_timezone_offset_minutes: number | null;
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

const ACTIVE_SESSION_QUERY = `SELECT id, planned_duration_ms, started_at_ms, accumulated_active_ms,
                                     resumed_at_ms, status, completion_sound, completion_local_date,
                                     completion_timezone_offset_minutes
                              FROM active_session WHERE singleton_id = 1`;

function loadActiveSessionRow(database: Pick<SQLiteDatabase, "getFirstAsync">) {
  return database.getFirstAsync<ActiveSessionRow>(ACTIVE_SESSION_QUERY);
}

function mapActiveSession(row: ActiveSessionRow) {
  const remainingMs = Math.max(0, row.planned_duration_ms - row.accumulated_active_ms);
  const completionAtMs =
    row.status === "running" && row.resumed_at_ms !== null
      ? row.resumed_at_ms + remainingMs
      : row.started_at_ms + row.planned_duration_ms;
  return activeSessionSchema.parse({
    id: row.id,
    plannedDurationMs: row.planned_duration_ms,
    startedAtMs: row.started_at_ms,
    accumulatedActiveMs: row.accumulated_active_ms,
    resumedAtMs: row.resumed_at_ms,
    status: row.status,
    completionSound: row.completion_sound,
    completionLocalDate: row.completion_local_date ?? toLocalDateKey(completionAtMs),
    completionTimezoneOffsetMinutes:
      row.completion_timezone_offset_minutes ?? new Date(completionAtMs).getTimezoneOffset(),
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
  private readonly writeQueue = new SerialTaskQueue();

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
    await this.enqueueWrite(async () => {
      await this.db.runAsync(
        `INSERT INTO preferences (singleton_id, value) VALUES (1, ?)
         ON CONFLICT(singleton_id) DO UPDATE SET value = excluded.value`,
        JSON.stringify(value),
      );
    });
  }

  async loadActiveSession() {
    const row = await loadActiveSessionRow(this.db);
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
    const preferences = appPreferencesSchema.parse(input.preferences);
    const session = createActiveSession(input);

    return this.enqueueWrite(async () => {
      await this.db.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync(
          `INSERT INTO preferences (singleton_id, value) VALUES (1, ?)
           ON CONFLICT(singleton_id) DO UPDATE SET value = excluded.value`,
          JSON.stringify(preferences),
        );
        await transaction.runAsync(
          `INSERT INTO active_session (
             singleton_id, id, planned_duration_ms, started_at_ms,
             accumulated_active_ms, resumed_at_ms, status, completion_sound,
             completion_local_date, completion_timezone_offset_minutes
           ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          session.id,
          session.plannedDurationMs,
          session.startedAtMs,
          session.accumulatedActiveMs,
          session.resumedAtMs,
          session.status,
          session.completionSound,
          session.completionLocalDate,
          session.completionTimezoneOffsetMinutes,
        );
      });
      return session;
    });
  }

  async pauseActiveSession(nowMs: number) {
    return this.transitionActiveSession(nowMs, pauseSession);
  }

  async resumeActiveSession(nowMs: number) {
    return this.transitionActiveSession(nowMs, resumeSession);
  }

  completeActiveSession(nowMs: number): Promise<CompletedSession | null> {
    return this.enqueueWrite(async () => {
      let completed: CompletedSession | null = null;

      await this.db.withExclusiveTransactionAsync(async (transaction) => {
        const row = await loadActiveSessionRow(transaction);
        if (!row) {
          return;
        }

        const active = mapActiveSession(row);
        if (!projectSession(active, nowMs).isComplete) {
          throw new Error("A session cannot be completed while time remains.");
        }

        completed = completeSession(active, nowMs);
        await transaction.runAsync(
          `INSERT INTO completed_sessions (
             id, started_at_ms, completed_at_ms, local_date, timezone_offset_minutes,
             duration_ms, completion_sound, feeling, acknowledged_at_ms
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`,
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
    });
  }

  async abandonActiveSession() {
    await this.enqueueWrite(async () => {
      await this.db.runAsync("DELETE FROM active_session WHERE singleton_id = 1");
    });
  }

  async updateSessionFeeling(id: string, feeling: Feeling | null) {
    const parsedFeeling = feeling === null ? null : completedSessionSchema.shape.feeling.parse(feeling);
    await this.enqueueWrite(async () => {
      await this.db.runAsync("UPDATE completed_sessions SET feeling = ? WHERE id = ?", parsedFeeling, id);
    });
  }

  async acknowledgeSession(id: string, acknowledgedAtMs: number) {
    await this.enqueueWrite(async () => {
      await this.db.runAsync(
        `UPDATE completed_sessions
         SET acknowledged_at_ms = MAX(completed_at_ms, ?)
         WHERE id = ? AND acknowledged_at_ms IS NULL`,
        acknowledgedAtMs,
        id,
      );
    });
  }

  async resetAllData() {
    await this.enqueueWrite(async () => {
      await this.db.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync("DELETE FROM completed_sessions");
        await transaction.runAsync("DELETE FROM active_session");
        await transaction.runAsync("DELETE FROM preferences");
        await transaction.runAsync(
          "INSERT INTO preferences (singleton_id, value) VALUES (1, ?)",
          JSON.stringify(DEFAULT_PREFERENCES),
        );
      });
    });
  }

  private transitionActiveSession(
    nowMs: number,
    transition: (session: ActiveSession, transitionAtMs: number) => ActiveSession,
  ) {
    return this.enqueueWrite(async () => {
      let next: ActiveSession | null = null;

      await this.db.withExclusiveTransactionAsync(async (transaction) => {
        const row = await loadActiveSessionRow(transaction);
        if (!row) {
          throw new Error("No meditation session is active.");
        }

        next = activeSessionSchema.parse(transition(mapActiveSession(row), nowMs));
        const result = await transaction.runAsync(
          `UPDATE active_session
           SET accumulated_active_ms = ?, resumed_at_ms = ?, status = ?,
               completion_local_date = ?, completion_timezone_offset_minutes = ?
           WHERE singleton_id = 1 AND id = ?`,
          next.accumulatedActiveMs,
          next.resumedAtMs,
          next.status,
          next.completionLocalDate,
          next.completionTimezoneOffsetMinutes,
          next.id,
        );
        if (result.changes !== 1) {
          throw new Error("The active meditation session changed before it could be updated.");
        }
      });

      if (!next) {
        throw new Error("The active meditation session could not be updated.");
      }
      return next;
    });
  }

  private enqueueWrite<T>(write: () => Promise<T>) {
    return this.writeQueue.run(write);
  }
}
