// The name for "Hi, …": Google's given name if Supabase kept it, else the first
// word of the full name. Never the email: with no name we just say "Hi".
export function firstName(meta: Record<string, unknown> | undefined): string | null {
  const given = typeof meta?.given_name === "string" ? meta.given_name.trim() : "";
  if (given) return given;
  for (const key of ["full_name", "name"]) {
    const value = meta?.[key];
    if (typeof value !== "string") continue;
    const first = value.trim().split(/\s+/)[0];
    // A "name" that is really an email address isn't a name.
    if (first && !first.includes("@")) return first;
  }
  return null;
}
