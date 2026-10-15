// Ocean ambience: what SHOULD be playing, and how loud. Pure (tested); the
// Web Audio engine in lib/ambience.ts just follows the answer.

export type AmbienceSound = "waves" | "underwater" | "calm";
export type AmbienceChoice = AmbienceSound | "off";

export const AMBIENCE_LABEL: Record<AmbienceChoice, string> = {
  off: "Off",
  waves: "Waves",
  underwater: "Underwater",
  calm: "Calm sea",
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
