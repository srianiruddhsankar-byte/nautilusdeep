"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "../_ui/button";

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
    <Button variant="primary" size="lg" onClick={signIn} disabled={loading}>
      {loading ? "Opening Google…" : "Sign in with Google"}
    </Button>
  );
}
