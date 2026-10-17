import type { ReactNode } from "react";

// The frame every signed-in page uses: phone width, 16 px gutters, the same
// top padding and section gap as Home, so switching tabs never shifts things.
export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-6 pb-8">{children}</main>;
}
