import type { SQLiteDatabase } from "expo-sqlite";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { initializeDatabase } from "@/data/database";
import { SQLiteMeditationStore } from "@/data/sqlite-meditation-store";
import { DEFAULT_PREFERENCES } from "@/domain/meditation";

const STARTED_AT = new Date(2026, 6, 13, 7, 0).getTime();

class NodeSQLiteTestDatabase {
  readonly native = new DatabaseSync(":memory:");
  private transactionQueue = Promise.resolve();

  async execAsync(source: string) {
    this.native.exec(source);
  }

  async runAsync(source: string, ...params: unknown[]) {
    const result = this.native.prepare(source).run(...(params as SQLInputValue[]));
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]) {
    return (this.native.prepare(source).get(...(params as SQLInputValue[])) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]) {
    return this.native.prepare(source).all(...(params as SQLInputValue[])) as T[];
  }

  async withExclusiveTransactionAsync(task: (transaction: SQLiteDatabase) => Promise<void>) {
    const operation = this.transactionQueue.then(async () => {
      this.native.exec("BEGIN EXCLUSIVE");
      try {
        await task(this as unknown as SQLiteDatabase);
        this.native.exec("COMMIT");
      } catch (error) {
        this.native.exec("ROLLBACK");
        throw error;
      }
    });
    this.transactionQueue = operation.catch(() => undefined);
    return operation;
  }

  asExpoDatabase() {
    return this as unknown as SQLiteDatabase;
  }
}

describe("SQLiteMeditationStore", () => {
  it("rolls back preferences when an active-session insert is rejected", async () => {
    const database = new NodeSQLiteTestDatabase();
    await initializeDatabase(database.asExpoDatabase());
    const store = new SQLiteMeditationStore(database.asExpoDatabase());
    await store.startSession({
      id: "first-session",
      durationMinutes: 5,
      startedAtMs: STARTED_AT,
      completionSound: "soft-chime",
      preferences: { ...DEFAULT_PREFERENCES, lastDurationMinutes: 5 },
    });

    await expect(
      store.startSession({
        id: "second-session",
        durationMinutes: 30,
        startedAtMs: STARTED_AT + 1_000,
        completionSound: "wood-tone",
        preferences: { ...DEFAULT_PREFERENCES, lastDurationMinutes: 30, completionSound: "wood-tone" },
      }),
    ).rejects.toThrow();

    await expect(store.loadPreferences()).resolves.toMatchObject({
      lastDurationMinutes: 5,
      completionSound: "soft-chime",
    });
    await expect(store.loadActiveSession()).resolves.toMatchObject({ id: "first-session" });
  });

  it("persists pause, resume, completion, acknowledgment, and reset through SQLite", async () => {
    const database = new NodeSQLiteTestDatabase();
    await initializeDatabase(database.asExpoDatabase());
    const store = new SQLiteMeditationStore(database.asExpoDatabase());
    await store.startSession({
      id: "completed-session",
      durationMinutes: 5,
      startedAtMs: STARTED_AT,
      completionSound: "low-bowl",
      preferences: { ...DEFAULT_PREFERENCES, lastDurationMinutes: 5, completionSound: "low-bowl" },
    });

    await store.pauseActiveSession(STARTED_AT + 60_000);
    await store.resumeActiveSession(STARTED_AT + 2 * 60_000);
    const completed = await store.completeActiveSession(STARTED_AT + 6 * 60_000);
    await store.acknowledgeSession("completed-session", STARTED_AT);

    expect(completed).toMatchObject({ id: "completed-session", durationMs: 5 * 60_000 });
    await expect(store.completeActiveSession(STARTED_AT + 7 * 60_000)).resolves.toBeNull();
    await expect(store.listCompletedSessions()).resolves.toEqual([
      expect.objectContaining({
        id: "completed-session",
        acknowledgedAtMs: completed?.completedAtMs,
      }),
    ]);

    await store.resetAllData();
    await expect(store.loadActiveSession()).resolves.toBeNull();
    await expect(store.listCompletedSessions()).resolves.toEqual([]);
    await expect(store.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });

  it("does not restore an active session when pausing races automatic completion", async () => {
    const database = new NodeSQLiteTestDatabase();
    await initializeDatabase(database.asExpoDatabase());
    const store = new SQLiteMeditationStore(database.asExpoDatabase());
    await store.startSession({
      id: "racing-session",
      durationMinutes: 5,
      startedAtMs: STARTED_AT,
      completionSound: "soft-chime",
      preferences: DEFAULT_PREFERENCES,
    });

    const [completion, pause] = await Promise.allSettled([
      store.completeActiveSession(STARTED_AT + 5 * 60_000),
      store.pauseActiveSession(STARTED_AT + 5 * 60_000),
    ]);

    expect(completion.status).toBe("fulfilled");
    expect(pause.status).toBe("rejected");
    await expect(store.loadActiveSession()).resolves.toBeNull();
    await expect(store.listCompletedSessions()).resolves.toEqual([expect.objectContaining({ id: "racing-session" })]);
  });

  it("migrates an existing active-session table to the current schema", async () => {
    const database = new NodeSQLiteTestDatabase();
    database.native.exec(`
      CREATE TABLE preferences (
        singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
        value TEXT NOT NULL
      );
      CREATE TABLE active_session (
        singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
        id TEXT NOT NULL UNIQUE,
        planned_duration_ms INTEGER NOT NULL CHECK (planned_duration_ms > 0),
        started_at_ms INTEGER NOT NULL CHECK (started_at_ms >= 0),
        accumulated_active_ms INTEGER NOT NULL CHECK (accumulated_active_ms >= 0),
        resumed_at_ms INTEGER,
        status TEXT NOT NULL CHECK (status IN ('running', 'paused')),
        completion_sound TEXT NOT NULL CHECK (completion_sound IN ('soft-chime', 'low-bowl', 'wood-tone')),
        CHECK (
          (status = 'running' AND resumed_at_ms IS NOT NULL) OR
          (status = 'paused' AND resumed_at_ms IS NULL)
        )
      );
      CREATE TABLE completed_sessions (
        id TEXT PRIMARY KEY,
        started_at_ms INTEGER NOT NULL CHECK (started_at_ms >= 0),
        completed_at_ms INTEGER NOT NULL CHECK (completed_at_ms >= started_at_ms),
        local_date TEXT NOT NULL,
        timezone_offset_minutes INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
        completion_sound TEXT NOT NULL CHECK (completion_sound IN ('soft-chime', 'low-bowl', 'wood-tone')),
        feeling TEXT CHECK (feeling IS NULL OR feeling IN ('calm', 'clear', 'grounded', 'other')),
        acknowledged_at_ms INTEGER CHECK (acknowledged_at_ms IS NULL OR acknowledged_at_ms >= completed_at_ms)
      );
      CREATE INDEX completed_sessions_local_date_idx ON completed_sessions (local_date DESC);
      CREATE INDEX completed_sessions_completed_at_idx ON completed_sessions (completed_at_ms DESC);
      INSERT INTO active_session (
        singleton_id, id, planned_duration_ms, started_at_ms, accumulated_active_ms,
        resumed_at_ms, status, completion_sound
      ) VALUES (
        1, 'migrated-session', 300000, ${STARTED_AT}, 0,
        ${STARTED_AT}, 'running', 'soft-chime'
      );
      PRAGMA user_version = 1;
    `);

    await initializeDatabase(database.asExpoDatabase());
    const store = new SQLiteMeditationStore(database.asExpoDatabase());
    const expectedCompletionAt = STARTED_AT + 5 * 60_000;

    const version = database.native.prepare("PRAGMA user_version").get() as { user_version: number };
    const columns = database.native.prepare("PRAGMA table_info(active_session)").all() as { name: string }[];
    expect(version.user_version).toBe(2);
    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(["completion_local_date", "completion_timezone_offset_minutes"]),
    );
    await expect(store.loadActiveSession()).resolves.toMatchObject({
      id: "migrated-session",
      completionLocalDate: "2026-07-13",
      completionTimezoneOffsetMinutes: new Date(expectedCompletionAt).getTimezoneOffset(),
    });
    await expect(store.completeActiveSession(expectedCompletionAt)).resolves.toMatchObject({
      id: "migrated-session",
      completedAtMs: expectedCompletionAt,
    });
  });
});
