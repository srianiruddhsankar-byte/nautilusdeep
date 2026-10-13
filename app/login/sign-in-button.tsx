"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInButton() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser navigates to Google, so we only get here on failure.
    if (error) setLoading(false);
  }

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="rounded-lg bg-sky-700 px-5 py-3 font-medium text-white hover:bg-sky-800 disabled:opacity-60"
    >
      {loading ? "Redirecting…" : "Sign in with Google"}
    </button>
  );
}
