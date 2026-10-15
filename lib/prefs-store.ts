import { createLocalStore } from "./local-store";
import { sanitizePrefs, type SetupPrefs } from "./setup-prefs";

// Last-used setup, in this browser only. Read through sanitizePrefs, so a bad
// stored value can never break anything. Saved on Start, and by the running
// screen's sound control (so a volume change there sticks for next time).
const store = createLocalStore<unknown>("deep-nautilus:setup:v1", null, () => true);

export function loadPrefs(): SetupPrefs {
  return sanitizePrefs(store.get());
}

export function savePrefs(prefs: SetupPrefs) {
  store.set(prefs);
}

export function updatePrefs(patch: Partial<SetupPrefs>) {
  store.set({ ...loadPrefs(), ...patch });
}
