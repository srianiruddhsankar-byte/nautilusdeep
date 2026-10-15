// Ocean ambience: what SHOULD be playing, how loud, and which tank scene goes
// with it. Pure (tested); the Web Audio engine in lib/ambience.ts and the tank
// scenes in app/_tank/ambience-scene.tsx just follow the answers.

// Ids are stored in prefs and on running sessions: never rename one, only add.
export type AmbienceSound = "rain" | "waves" | "whales" | "stream" | "night";
export type AmbienceChoice = AmbienceSound | "off";

export const AMBIENCE_SOUNDS: AmbienceSound[] = ["rain", "waves", "whales", "stream", "night"];
export const AMBIENCE_CHOICES: AmbienceChoice[] = ["off", ...AMBIENCE_SOUNDS];

export const AMBIENCE_LABEL: Record<AmbienceChoice, string> = {
  off: "Off",
  rain: "Rain",
  waves: "Waves",
  whales: "Whales",
  stream: "Stream",
  night: "Night",
};

export const AMBIENCE_DESCRIPTION: Record<AmbienceChoice, string> = {
  off: "Silence",
  rain: "Light rain falling on the water",
  waves: "Waves building, breaking and drawing back",
  whales: "A deep hum and distant whale calls",
  stream: "A bubbly little trickle",
  night: "Soft dark waves and faraway crickets",
};

// Sounds from the earlier, larger library (still in old prefs or a session
// started before the update) → the closest of today's five.
const RETIRED: Record<string, AmbienceSound> = {
  calm: "waves",
  harbour: "waves",
  underwater: "whales",
  deep: "whales",
  rockpool: "stream",
};

export function toAmbienceChoice(value: unknown): AmbienceChoice {
  if (typeof value !== "string") return "off";
  if ((AMBIENCE_CHOICES as string[]).includes(value)) return value as AmbienceChoice;
  return RETIRED[value] ?? "off";
}

export const DEFAULT_VOLUME = 0.6;
// While an alarm or a "Still studying?" check-in sounds, the ambience drops to
// this share of its volume so the alert is clearly heard.
export const DUCK_LEVEL = 0.2;

// Volume from a slider or storage: 0–1, in steps of 0.05.
export function cleanVolume(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_VOLUME;
  return Math.round(Math.min(1, Math.max(0, n)) * 20) / 20;
}

export type AmbienceTarget = { sound: AmbienceSound; gain: number } | null;

export const PREVIEW_SECONDS = 10;

// Tapping a sound in Session settings: it becomes the choice AND plays a
// preview; tapping the one that's previewing stops it (still chosen).
// "Off" chooses off and stops any preview.
export function previewTap(
  previewing: AmbienceSound | null,
  tapped: AmbienceChoice,
): { choose: AmbienceChoice; preview: AmbienceSound | null } {
  if (tapped === "off") return { choose: "off", preview: null };
  if (previewing === tapped) return { choose: tapped, preview: null };
  return { choose: tapped, preview: tapped };
}

// null = nothing should be playing (no session, Ambience off, or paused —
// by the sound button or by the session's pause). Breaks don't matter.
export function ambienceTarget({
  sound,
  running,
  paused,
  volume,
  alerting,
}: {
  sound: string | null | undefined; // the running session's choice (may be an old id)
  running: boolean; // a session is running (not ended or cancelled)
  paused: boolean; // paused from the running screen, or the session is paused
  volume: number;
  alerting: boolean; // an alarm is ringing or a check-in is waiting
}): AmbienceTarget {
  const choice = toAmbienceChoice(sound);
  if (!running || paused || choice === "off") return null;
  return { sound: choice, gain: cleanVolume(volume) * (alerting ? DUCK_LEVEL : 1) };
}

// Which ambience scene the tank shows. During a session: its sound, unless
// paused. Otherwise (Home, setup): whatever is being previewed.
export function sceneFor({
  running,
  sound,
  paused,
  previewing,
}: {
  running: boolean;
  sound: string | null | undefined;
  paused: boolean;
  previewing: AmbienceSound | null;
}): AmbienceSound | null {
  if (!running) return previewing;
  const choice = toAmbienceChoice(sound);
  return paused || choice === "off" ? null : choice;
}
