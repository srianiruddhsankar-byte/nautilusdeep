// The pieces of a continued session (or a cycle), as saved in sessions.parts:
// study blocks and breaks in order. Pure: no React, no clock.
// Only focus pieces are study time; breaks never count toward time, coins or
// streaks (those all use focus_seconds, which is the focus pieces added up).

export type SessionPart = { type: "focus" | "break"; seconds: number; task?: string | null };

// The column as it comes back from the database (or an old queued row):
// anything that isn't a clean list of parts reads as "no parts".
export function readParts(value: unknown): SessionPart[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parts: SessionPart[] = [];
  for (const p of value) {
    if (!p || typeof p !== "object") return null;
    const { type, seconds, task } = p as Record<string, unknown>;
    if ((type !== "focus" && type !== "break") || typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
    parts.push({ type, seconds: Math.max(0, Math.floor(seconds)), task: typeof task === "string" ? task : null });
  }
  return parts;
}

// Whole minutes for a line of history; under a minute says so.
export function partMinutes(seconds: number): string {
  return seconds < 60 ? "<1 min" : `${Math.round(seconds / 60)} min`;
}

// "12 min study · 10 min break · 12 min study" (or "notes" for a notes session).
export function describeParts(parts: SessionPart[], kind: "study" | "notes" = "study"): string {
  return parts.map((p) => `${partMinutes(p.seconds)} ${p.type === "focus" ? kind : "break"}`).join(" · ");
}

type Row = { task_name: string | null; focus_seconds: number; started_at: string; ended_at: string; parts?: unknown };

// Study time per task in one row. A continued session can switch tasks, so its
// parts say which task each block was; otherwise it's all the row's task.
// Tasks are grouped as written (callers group case-insensitively).
export function focusByTask(row: Row): { name: string; seconds: number }[] {
  const parts = readParts(row.parts);
  if (!parts) return row.task_name ? [{ name: row.task_name, seconds: row.focus_seconds }] : [];
  const out: { name: string; seconds: number }[] = [];
  for (const p of parts) {
    const name = p.type === "focus" ? (p.task ?? null) : null;
    if (!name) continue;
    const same = out.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (same) same.seconds += p.seconds;
    else out.push({ name, seconds: p.seconds });
  }
  return out;
}

// When the study actually happened: one span per focus piece, laid end to end
// from the start (breaks in between take up time too). Without parts, the
// whole row. For the "time of day" chart.
export function focusSpans(row: Row): { start: number; end: number; seconds: number }[] {
  const start = Date.parse(row.started_at);
  const parts = readParts(row.parts);
  if (!parts) return [{ start, end: Date.parse(row.ended_at), seconds: row.focus_seconds }];
  const spans: { start: number; end: number; seconds: number }[] = [];
  let t = start;
  for (const p of parts) {
    const end = t + p.seconds * 1000;
    if (p.type === "focus" && p.seconds > 0) spans.push({ start: t, end, seconds: p.seconds });
    t = end;
  }
  return spans;
}
