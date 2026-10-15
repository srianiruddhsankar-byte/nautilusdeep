import type { EndReason, FocusMode, Mode, Result, SessionType } from "./timer";

// The shape of one row in the Supabase `sessions` table
// (see supabase/migrations/: create_sessions, then tasks_and_session_types).
export type Outcome = "completed" | "failed" | "partial";

export type SessionRow = {
  id: string;
  user_id: string | null; // null = fill in with whoever is signed in when it's sent
  mode: Mode;
  focus_mode: FocusMode;
  outcome: Outcome;
  ended_by: EndReason;
  started_at: string; // ISO timestamps
  ended_at: string;
  focus_seconds: number;
  blocks_completed: number | null; // cycle only
  blocks_planned: number | null; // cycle only
  planned_minutes: number | null; // null for the stopwatch
  session_type: SessionType;
  task_name: string | null;
  target_minutes: number | null; // notes only
};

// Pure: no ids or clock reads here, the caller passes them in.
export function toRow(result: Result, id: string, userId: string | null): SessionRow {
  const isCycle = result.mode === "cycle";
  return {
    id,
    user_id: userId,
    mode: result.mode,
    focus_mode: result.focusMode,
    outcome: outcomeOf(result),
    ended_by: result.endedBy,
    started_at: new Date(result.startedAt).toISOString(),
    ended_at: new Date(result.endedAt).toISOString(),
    focus_seconds: Math.floor(result.focusMs / 1000),
    blocks_completed: isCycle ? result.blocksCompleted : null,
    blocks_planned: isCycle ? result.totalBlocks : null,
    planned_minutes: result.plannedMs === null ? null : Math.round(result.plannedMs / 60_000),
    session_type: result.sessionType,
    task_name: result.task,
    target_minutes: result.targetMinutes,
  };
}

// Rows queued in this browser before Phase 6 don't have the new columns.
// Fill them in the same way the database does (Study, no task, no target).
export function withRowDefaults<T extends Partial<Pick<SessionRow, "session_type" | "task_name" | "target_minutes">>>(
  row: T,
) {
  return {
    ...row,
    session_type: row.session_type ?? "study",
    task_name: row.task_name ?? null,
    target_minutes: row.target_minutes ?? null,
  };
}

// partial = a cycle that ended early but kept some banked blocks
// (it lost an unfinished block, or was stopped during a short break).
export function outcomeOf(result: Result): Outcome {
  if (result.outcome === "failed") return "failed";
  if (result.mode === "cycle" && result.blocksCompleted < result.totalBlocks) return "partial";
  return "completed";
}
