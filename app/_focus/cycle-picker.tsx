"use client";

import { useState, type FormEvent } from "react";
import {
  MAX_REPEAT,
  blocksFromSettings,
  describeBlocks,
  totalMinutes,
  type CycleBlock,
  type CycleTemplate,
} from "@/lib/cycle-blocks";
import { deleteCycle, saveCycle, useCycles } from "@/lib/cycles";
import { formatDuration } from "@/lib/stats";
import { CUSTOM, DEFAULT_CHOICE, type CustomFields } from "@/lib/setup-prefs";
import { CYCLE_NAME_MAX } from "@/lib/task-name";
import { isValidMinutes } from "@/lib/timer";
import { Button } from "../_ui/button";
import { inputClass, NumberField } from "../_ui/field";
import { Chip } from "../_ui/segmented";
import { toast } from "../_ui/toast";

// The four Custom fields as blocks, or null while any field is invalid.
function customBlocks(f: CustomFields): CycleBlock[] | null {
  const n = {
    focusMin: Number(f.focusMin),
    shortBreakMin: Number(f.shortBreakMin),
    longBreakMin: Number(f.longBreakMin),
    blocksPerSet: Number(f.blocksPerSet),
  };
  const valid =
    isValidMinutes(n.focusMin) &&
    isValidMinutes(n.shortBreakMin) &&
    isValidMinutes(n.longBreakMin) &&
    Number.isInteger(n.blocksPerSet) &&
    n.blocksPerSet >= 1 &&
    n.blocksPerSet <= MAX_REPEAT;
  return valid ? blocksFromSettings(n) : null;
}

// The choice to show and use. A remembered saved cycle may not have loaded yet
// (wait for it), or may have been deleted since (fall back to Pomodoro).
export function effectiveChoice(choice: string, cycles: CycleTemplate[], loaded: boolean): string | null {
  if (choice === CUSTOM || cycles.some((c) => c.id === choice)) return choice;
  return loaded ? DEFAULT_CHOICE : null;
}

// What Start will run: the chosen cycle's blocks and name (null name = Custom).
// Null blocks while Custom has an invalid field or the choice is still loading.
export function resolveCycle(
  choice: string | null,
  cycles: CycleTemplate[],
  custom: CustomFields,
): { blocks: CycleBlock[] | null; name: string | null } {
  if (choice === null) return { blocks: null, name: null };
  if (choice === CUSTOM) return { blocks: customBlocks(custom), name: null };
  const chosen = cycles.find((c) => c.id === choice) ?? cycles[0];
  return { blocks: chosen.blocks, name: chosen.name };
}

export function CyclePicker({
  choice,
  onChoice,
  custom,
  onCustom,
}: {
  choice: string;
  onChoice: (id: string) => void;
  custom: CustomFields;
  onCustom: (fields: CustomFields) => void;
}) {
  const { cycles, loaded, error } = useCycles();
  const current = effectiveChoice(choice, cycles, loaded);
  const { blocks } = resolveCycle(current, cycles, custom);
  const chosen = cycles.find((c) => c.id === current);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove(cycle: CycleTemplate) {
    setBusy(true);
    const message = await deleteCycle(cycle.id);
    setBusy(false);
    setActionError(message);
    if (!message) {
      onChoice(DEFAULT_CHOICE);
      toast(`Deleted “${cycle.name}”`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cycle">
        {[...cycles, { id: CUSTOM, name: "Custom" }].map((c) => (
          <Chip key={c.id} on={current === c.id} onClick={() => onChoice(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>

      <p className={`text-sm ${blocks || current === null ? "text-muted" : "text-warn"}`} aria-live="polite">
        {blocks
          ? `${describeBlocks(blocks)} · ${formatDuration(totalMinutes(blocks) * 60)} total`
          : current === null
            ? "Loading your cycles…"
            : "Check the numbers: minutes from 1 to 600, up to 12 blocks."}
      </p>

      {current === CUSTOM && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Focus (min)"
              value={custom.focusMin}
              onChange={(v) => onCustom({ ...custom, focusMin: v })}
            />
            <NumberField
              label="Short break (min)"
              value={custom.shortBreakMin}
              onChange={(v) => onCustom({ ...custom, shortBreakMin: v })}
            />
            <NumberField
              label="Long break (min)"
              value={custom.longBreakMin}
              onChange={(v) => onCustom({ ...custom, longBreakMin: v })}
            />
            <NumberField
              label="Blocks per set"
              value={custom.blocksPerSet}
              onChange={(v) => onCustom({ ...custom, blocksPerSet: v })}
            />
          </div>
          {blocks && <SaveCycle blocks={blocks} onSaved={onChoice} />}
        </>
      )}

      {chosen && !chosen.premade && (
        <Button
          variant="quiet"
          size="sm"
          disabled={busy}
          onClick={() => remove(chosen)}
          className="-ml-3.5 self-start text-danger hover:text-danger"
        >
          Delete “{chosen.name}”
        </Button>
      )}
      {(actionError ?? error) && <p className="text-sm text-danger">{actionError ?? error}</p>}
    </div>
  );
}

// "Save as…": keeps the current Custom settings under a name, then selects it.
function SaveCycle({ blocks, onSaved }: { blocks: CycleBlock[]; onSaved: (id: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await saveCycle(name, blocks);
    setBusy(false);
    setError(result.error);
    if (result.id) {
      toast(`Saved “${name.trim()}”`);
      setName("");
      onSaved(result.id);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={CYCLE_NAME_MAX}
          placeholder="Save as… e.g. Exam prep"
          aria-label="Name for this cycle"
          enterKeyHint="done"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <Button type="submit" variant="secondary" disabled={busy || name.trim() === ""}>
          Save
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
