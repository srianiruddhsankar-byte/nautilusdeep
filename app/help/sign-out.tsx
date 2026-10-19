"use client";

import { forgetThisDevice } from "@/lib/push";
import { Button } from "../_ui/button";

// Sign out: first remove this device from your notifications (so a friend
// signing in on this phone never gets yours), then the server signs you out.
export function SignOutButton({ signOut }: { signOut: () => Promise<void> }) {
  return (
    <form
      action={async () => {
        await forgetThisDevice();
        await signOut();
      }}
    >
      <Button type="submit" variant="outline" className="w-full">
        Sign out
      </Button>
    </form>
  );
}
