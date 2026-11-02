// "What's new": the newest CHANGELOG.md entry, shown once on Home after an
// update. Pure: next.config.ts reads the file at build (and dev start) and
// passes the result in as NEXT_PUBLIC_WHATS_NEW, the same way as the build id.
//
// An entry is "## <date> · <name>", then a "### What's new" list of "- " bullets
// (a bullet can wrap onto indented lines). The id is the whole heading, so a
// deploy with only small fixes (no new entry) never shows it again.

export type WhatsNew = { id: string; name: string; bullets: string[] };

export function newestEntry(markdown: string): WhatsNew | null {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /^## \d{4}-\d{2}-\d{2} · /.test(l));
  if (start === -1) return null;
  const id = lines[start].slice(3).trim();
  const name = id.split(" · ").slice(1).join(" · ");

  const bullets: string[] = [];
  let inList = false;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break; // the next entry
    if (line.startsWith("### ")) {
      inList = line.trim() === "### What's new";
      continue;
    }
    if (!inList) continue;
    if (line.startsWith("- ")) bullets.push(plain(line.slice(2)));
    else if (/^\s+\S/.test(line) && bullets.length > 0) bullets[bullets.length - 1] += ` ${plain(line.trim())}`;
  }
  return bullets.length > 0 ? { id, name, bullets } : null;
}

// Markdown emphasis and code marks off: the card shows plain words.
function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1").trim();
}

// The env value back into an entry (null when missing or broken).
export function parseWhatsNew(json: string | undefined): WhatsNew | null {
  if (!json) return null;
  try {
    const data: unknown = JSON.parse(json);
    if (
      data &&
      typeof data === "object" &&
      typeof (data as WhatsNew).id === "string" &&
      typeof (data as WhatsNew).name === "string" &&
      Array.isArray((data as WhatsNew).bullets) &&
      (data as WhatsNew).bullets.every((b) => typeof b === "string")
    ) {
      return data as WhatsNew;
    }
  } catch {}
  return null;
}

// Show it? Only to someone who used the app before this entry (a brand-new user
// has nothing "new" to hear about), and only until they've seen it.
export function showWhatsNew(entry: WhatsNew | null, seenId: string | null, finishedSession: boolean): boolean {
  return entry !== null && finishedSession && seenId !== entry.id;
}
