// Names typed by the user (tasks, saved cycles). Pure.

export const TASK_NAME_MAX = 100;
export const CYCLE_NAME_MAX = 40;

// "  Biochem   ch. 4 " → "Biochem ch. 4". Blank → null.
export function cleanName(raw: string | null | undefined, max: number): string | null {
  const name = (raw ?? "").trim().replace(/\s+/g, " ").slice(0, max).trim();
  return name === "" ? null : name;
}

// Blank → null (= no task).
export function cleanTaskName(raw: string | null | undefined): string | null {
  return cleanName(raw, TASK_NAME_MAX);
}

// "Biochem ch. 4" and "biochem CH. 4" are the same task (or cycle). The database's
// unique indexes use lower(name) to match.
export function taskKey(name: string): string {
  return name.toLowerCase();
}
