import type { SQLiteDatabase } from "expo-sqlite";

import { DEFAULT_PREFERENCES } from "@/domain/meditation";

const DATABASE_VERSION = 2;

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const versionRow = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error("This version of Moss cannot open the local practice database.");
  }

  if (currentVersion < 1) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        CREATE TABLE IF NOT EXISTS preferences (
          singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS active_session (
          singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
          id TEXT NOT NULL UNIQUE,
          planned_duration_ms INTEGER NOT NULL CHECK (planned_duration_ms > 0),
          started_at_ms INTEGER NOT NULL CHECK (started_at_ms >= 0),
          accumulated_active_ms INTEGER NOT NULL CHECK (accumulated_active_ms >= 0),
          resumed_at_ms INTEGER,
          status TEXT NOT NULL CHECK (status IN ('running', 'paused')),
          completion_sound TEXT NOT NULL CHECK (completion_sound IN ('soft-chime', 'low-bowl', 'wood-tone')),
          completion_local_date TEXT NOT NULL,
          completion_timezone_offset_minutes INTEGER NOT NULL,
          CHECK (
            (status = 'running' AND resumed_at_ms IS NOT NULL) OR
            (status = 'paused' AND resumed_at_ms IS NULL)
          )
        );

        CREATE TABLE IF NOT EXISTS completed_sessions (
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

        CREATE INDEX IF NOT EXISTS completed_sessions_local_date_idx
          ON completed_sessions (local_date DESC);
        CREATE INDEX IF NOT EXISTS completed_sessions_completed_at_idx
          ON completed_sessions (completed_at_ms DESC);
      `);
      await transaction.runAsync(
        "INSERT OR IGNORE INTO preferences (singleton_id, value) VALUES (1, ?)",
        JSON.stringify(DEFAULT_PREFERENCES),
      );
      await transaction.execAsync("PRAGMA user_version = 2");
    });
    return;
  }

  if (currentVersion < 2) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        ALTER TABLE active_session ADD COLUMN completion_local_date TEXT;
        ALTER TABLE active_session ADD COLUMN completion_timezone_offset_minutes INTEGER;
        PRAGMA user_version = 2;
      `);
    });
  }
}
