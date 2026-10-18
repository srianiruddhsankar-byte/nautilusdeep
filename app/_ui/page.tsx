import { ViewTransition, type ReactNode } from "react";

// The frame every signed-in page uses: phone width, 16 px gutters, the same
// top padding and section gap as Home, so switching tabs never shifts things.
export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-6 pb-8">{children}</main>;
}

// A page's content, below its title. Moving between tabs (a nav link with the
// "tab" type), the old content fades out and the new one fades in, while the
// title and the nav bar stay put (globals.css, "Moving between tabs"). Any other
// change (a refresh, Back) has no animation. React's <ViewTransition> must be in
// each page, not the layout: layouts stay mounted, so they never enter or exit.
export function TabContent({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={{ tab: "tab-in", default: "none" }} exit={{ tab: "tab-out", default: "none" }} default="none">
      <div className="flex flex-1 flex-col gap-5">{children}</div>
    </ViewTransition>
  );
}
