import { MAX_REPEAT } from "./cycle-blocks.ts";
import { DEFAULT_CYCLE, isValidMinutes, type FocusMode, type Mode, type SessionType } from "./timer.ts";

// The setup screen's choices, remembered in this browser so the usual session
// is one tap: open the app, press Start. The task isn't remembered (you pick it
// per session). Pure: the storage itself lives in the setup form.

export type CustomFields = {
  focusMin: string;
  shortBreakMin: string;
  longBreakMin: string;
  blocksPerSet: string;
};

export type SetupPrefs = {
  sessionType: SessionType;
  mode: Mode;
  focusMode: FocusMode;
  minutes: string; // timer length
  target: string; // notes stopwatch target, "" = none
  cycleChoice: string; // a premade slug, a saved cycle's id, or "custom"
  custom: CustomFields;
};

export const CUSTOM = "custom";
export const DEFAULT_CHOICE = "pomodoro";

export const DEFAULT_CUSTOM: CustomFields = {
  focusMin: String(DEFAULT_CYCLE.focusMin),
  shortBreakMin: String(DEFAULT_CYCLE.shortBreakMin),
  longBreakMin: String(DEFAULT_CYCLE.longBreakMin),
  blocksPerSet: String(DEFAULT_CYCLE.blocksPerSet),
};

export const DEFAULT_PREFS: SetupPrefs = {
  sessionType: "study",
  mode: "timer",
  focusMode: "deep",
  minutes: "25",
  target: "",
  cycleChoice: DEFAULT_CHOICE,
  custom: DEFAULT_CUSTOM,
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

const minutesOr = (value: unknown, fallback: string) =>
  typeof value === "string" && isValidMinutes(Number(value)) ? value : fallback;

// Whatever is in storage (old versions, hand edits, nothing at all) becomes
// valid settings: each field is kept if it's valid, or reset to its default.
export function sanitizePrefs(data: unknown): SetupPrefs {
  const d = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const c = (typeof d.custom === "object" && d.custom !== null ? d.custom : {}) as Record<string, unknown>;
  const blocks = Number(c.blocksPerSet);

  return {
    sessionType: oneOf(d.sessionType, ["study", "notes"], DEFAULT_PREFS.sessionType),
    mode: oneOf(d.mode, ["timer", "stopwatch", "cycle"], DEFAULT_PREFS.mode),
    focusMode: oneOf(d.focusMode, ["deep", "open"], DEFAULT_PREFS.focusMode),
    minutes: minutesOr(d.minutes, DEFAULT_PREFS.minutes),
    target: d.target === "" ? "" : minutesOr(d.target, ""),
    cycleChoice:
      typeof d.cycleChoice === "string" && d.cycleChoice !== "" && d.cycleChoice.length <= 64
        ? d.cycleChoice
        : DEFAULT_CHOICE,
    custom: {
      focusMin: minutesOr(c.focusMin, DEFAULT_CUSTOM.focusMin),
      shortBreakMin: minutesOr(c.shortBreakMin, DEFAULT_CUSTOM.shortBreakMin),
      longBreakMin: minutesOr(c.longBreakMin, DEFAULT_CUSTOM.longBreakMin),
      blocksPerSet:
        typeof c.blocksPerSet === "string" && Number.isInteger(blocks) && blocks >= 1 && blocks <= MAX_REPEAT
          ? c.blocksPerSet
          : DEFAULT_CUSTOM.blocksPerSet,
    },
  };
}
