import type { EndReason, FocusMode, Mode, Result } from "./timer";

// The shape of one row in the Supabase `sessions` table
// (see supabase/migrations/20261014120000_create_sessions.sql).
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
  };
}

// partial = a cycle that ended early but kept some banked blocks
// (it lost an unfinished block, or was stopped during a short break).
export function outcomeOf(result: Result): Outcome {
  if (result.outcome === "failed") return "failed";
  if (result.mode === "cycle" && result.blocksCompleted < result.totalBlocks) return "partial";
  return "completed";
}
