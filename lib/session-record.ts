import { earnsFish, focusMinutes } from "./fish.ts";
import type { SessionPart } from "./session-parts.ts";
import { hatch } from "./species.ts";
import type { EndReason, FocusMode, Mode, Result, SessionType } from "./timer";

// The shape of one row in the Supabase `sessions` table
// (see supabase/migrations/: create_sessions, tasks_and_session_types, fish_species).
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
  cycle_name: string | null; // cycles only; null = Custom
  species: string | null; // the fish it hatched (lib/species.ts); null = no fish
  parts: SessionPart[] | null; // a continued session's or a cycle's pieces (lib/session-parts.ts); null = one plain session
};

// Pure: no ids or clock reads here, the caller passes them in.
export function toRow(result: Result, id: string, userId: string | null): SessionRow {
  const isCycle = result.mode === "cycle";
  const row: SessionRow = {
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
    cycle_name: isCycle ? (result.cycleName ?? null) : null,
    species: null,
    parts: result.parts ?? null,
  };
  // The fry hatches now, with today's odds, and the species is saved with the
  // row: changing the odds later never changes this fish.
  if (earnsFish(row)) row.species = hatch(id, focusMinutes(row));
  return row;
}

// Rows queued in this browser before Phase 6 (or before Continue session) don't
// have the new columns. Fill them in the same way the database does (Study, no
// task, target, cycle name or parts).
export function withRowDefaults<
  T extends Partial<Pick<SessionRow, "session_type" | "task_name" | "target_minutes" | "cycle_name" | "parts">>,
>(row: T) {
  return {
    ...row,
    session_type: row.session_type ?? "study",
    task_name: row.task_name ?? null,
    target_minutes: row.target_minutes ?? null,
    cycle_name: row.cycle_name ?? null,
    parts: row.parts ?? null,
  };
}

// partial = a cycle (or continued session) that ended early but kept some
// banked blocks (it lost an unfinished block, or was stopped during a short break).
export function outcomeOf(result: Result): Outcome {
  if (result.outcome === "failed") return "failed";
  // A cycle or a continued session that lost its last part keeps its finished parts.
  const blocks = result.mode === "cycle" || (result.parts !== null && result.parts !== undefined);
  if (blocks && result.blocksCompleted < result.totalBlocks) return "partial";
  return "completed";
}
