// Task names, shared by the task list, the setup form and the stats. Pure.

export const TASK_NAME_MAX = 100;

// "  Biochem   ch. 4 " → "Biochem ch. 4". Blank → null (= no task).
export function cleanTaskName(raw: string | null | undefined): string | null {
  const name = (raw ?? "").trim().replace(/\s+/g, " ").slice(0, TASK_NAME_MAX).trim();
  return name === "" ? null : name;
}

// "Biochem ch. 4" and "biochem CH. 4" are the same task in stats and the list.
export function taskKey(name: string): string {
  return name.toLowerCase();
}
