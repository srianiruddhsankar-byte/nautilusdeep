// Ocean ambience: what SHOULD be playing, and how loud. Pure (tested); the
// Web Audio engine in lib/ambience.ts just follows the answer.

// Ids are stored in prefs and on sessions: never rename one, only add.
export type AmbienceSound =
  | "waves"
  | "calm"
  | "night"
  | "rain"
  | "rockpool"
  | "stream"
  | "harbour"
  | "underwater"
  | "deep";
export type AmbienceChoice = AmbienceSound | "off";

// The order they're listed in Session settings: brightest / shore first, deepest last.
export const AMBIENCE_SOUNDS: AmbienceSound[] = [
  "waves",
  "calm",
  "night",
  "rain",
  "rockpool",
  "stream",
  "harbour",
  "underwater",
  "deep",
];
export const AMBIENCE_CHOICES: AmbienceChoice[] = ["off", ...AMBIENCE_SOUNDS];

export const AMBIENCE_LABEL: Record<AmbienceChoice, string> = {
  off: "Off",
  waves: "Waves",
  calm: "Calm sea",
  night: "Night shore",
  rain: "Rain on the sea",
  rockpool: "Rock pool",
  stream: "Gentle stream",
  harbour: "Harbour",
  underwater: "Underwater",
  deep: "Deep ocean",
};

export const AMBIENCE_DESCRIPTION: Record<AmbienceChoice, string> = {
  off: "Silence",
  waves: "Surf rolling in with slow swells",
  calm: "A soft, steady wash",
  night: "Slow, dark waves and faint crickets",
  rain: "Light rain pattering on open water",
  rockpool: "Small ripples and the odd drip",
  stream: "Water babbling over stones",
  harbour: "Water lapping at boats, a creak, a far bell",
  underwater: "Deep and muffled, with gentle bubbles",
  deep: "A low hum and distant whale calls",
};

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

// null = nothing should be playing (no session, Ambience off, or paused).
// Breaks don't matter: it keeps playing through them.
export function ambienceTarget({
  sound,
  running,
  paused,
  volume,
  alerting,
}: {
  sound: AmbienceChoice | null | undefined; // the running session's choice
  running: boolean; // a session is running (not ended or cancelled)
  paused: boolean; // paused from the running screen
  volume: number;
  alerting: boolean; // an alarm is ringing or a check-in is waiting
}): AmbienceTarget {
  if (!running || paused || !sound || sound === "off") return null;
  const gain = cleanVolume(volume) * (alerting ? DUCK_LEVEL : 1);
  return { sound, gain };
}
