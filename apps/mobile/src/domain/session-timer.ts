import { toLocalDateKey } from "./date-time";
import type { ActiveSession, CompletedSession } from "./meditation";
import { completedSessionSchema } from "./meditation";

export type SessionProjection = {
  elapsedMs: number;
  remainingMs: number;
  isComplete: boolean;
  phase: "active" | "ending" | "complete";
};

export function projectSession(session: ActiveSession, nowMs: number): SessionProjection {
  const runningElapsed =
    session.status === "running" && session.resumedAtMs !== null ? Math.max(0, nowMs - session.resumedAtMs) : 0;
  const elapsedMs = Math.min(session.plannedDurationMs, session.accumulatedActiveMs + runningElapsed);
  const remainingMs = Math.max(0, session.plannedDurationMs - elapsedMs);

  return {
    elapsedMs,
    remainingMs,
    isComplete: remainingMs === 0,
    phase: remainingMs === 0 ? "complete" : remainingMs <= 30_000 ? "ending" : "active",
  };
}

export function pauseSession(session: ActiveSession, nowMs: number): ActiveSession {
  if (session.status === "paused") {
    return session;
  }

  const projection = projectSession(session, nowMs);
  return {
    ...session,
    accumulatedActiveMs: projection.elapsedMs,
    resumedAtMs: null,
    status: "paused",
  };
}

export function resumeSession(session: ActiveSession, nowMs: number): ActiveSession {
  if (session.status === "running") {
    return session;
  }

  return {
    ...session,
    resumedAtMs: nowMs,
    status: "running",
  };
}

export function completeSession(session: ActiveSession, nowMs: number): CompletedSession {
  const projection = projectSession(session, nowMs);
  if (!projection.isComplete) {
    throw new Error("A session cannot be completed while time remains.");
  }

  const overtimeMs = Math.max(
    0,
    session.accumulatedActiveMs + Math.max(0, nowMs - (session.resumedAtMs ?? nowMs)) - session.plannedDurationMs,
  );
  const completedAtMs = nowMs - overtimeMs;

  return completedSessionSchema.parse({
    id: session.id,
    startedAtMs: session.startedAtMs,
    completedAtMs,
    localDate: toLocalDateKey(completedAtMs),
    timezoneOffsetMinutes: new Date(completedAtMs).getTimezoneOffset(),
    durationMs: session.plannedDurationMs,
    completionSound: session.completionSound,
    feeling: null,
    acknowledgedAtMs: null,
  });
}

export function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
