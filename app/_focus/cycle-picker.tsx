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
import { CYCLE_NAME_MAX } from "@/lib/task-name";
import { DEFAULT_CYCLE, isValidMinutes } from "@/lib/timer";

export const CUSTOM = "custom";
export const DEFAULT_CHOICE = "pomodoro";

export type CustomFields = {
  focusMin: string;
  shortBreakMin: string;
  longBreakMin: string;
  blocksPerSet: string;
};

export const DEFAULT_CUSTOM: CustomFields = {
  focusMin: String(DEFAULT_CYCLE.focusMin),
  shortBreakMin: String(DEFAULT_CYCLE.shortBreakMin),
  longBreakMin: String(DEFAULT_CYCLE.longBreakMin),
  blocksPerSet: String(DEFAULT_CYCLE.blocksPerSet),
};

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

// What Start will run: the chosen cycle's blocks and name (null name = Custom),
// or null blocks while Custom has an invalid field.
export function resolveCycle(
  choice: string,
  cycles: CycleTemplate[],
  custom: CustomFields,
): { blocks: CycleBlock[] | null; name: string | null } {
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
  const { cycles, error } = useCycles();
  const { blocks } = resolveCycle(choice, cycles, custom);
  const chosen = cycles.find((c) => c.id === choice);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove(cycle: CycleTemplate) {
    setBusy(true);
    const message = await deleteCycle(cycle.id);
    setBusy(false);
    setActionError(message);
    if (!message) onChoice(DEFAULT_CHOICE);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cycle">
        {[...cycles, { id: CUSTOM, name: "Custom" }].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChoice(c.id)}
            aria-pressed={choice === c.id}
            className={`max-w-full truncate rounded-full border px-4 py-2 text-sm font-medium ${
              choice === c.id ? "border-sky-700 bg-sky-700 text-white" : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-zinc-500" aria-live="polite">
        {blocks
          ? `${describeBlocks(blocks)} · ${formatDuration(totalMinutes(blocks) * 60)} total`
          : "Check the numbers: minutes from 1 to 600, up to 12 blocks."}
      </p>

      {choice === CUSTOM && (
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
        <button
          type="button"
          disabled={busy}
          onClick={() => remove(chosen)}
          className="self-start rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-900"
        >
          Delete “{chosen.name}”
        </button>
      )}
      {(actionError ?? error) && <p className="text-sm text-red-600">{actionError ?? error}</p>}
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
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2.5 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={busy || name.trim() === ""}
          className="rounded-lg border border-sky-700 px-4 font-medium text-sky-700 disabled:opacity-40 dark:text-sky-400"
        >
          Save
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-500">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-3 text-lg text-foreground dark:border-zinc-700"
      />
    </label>
  );
}
