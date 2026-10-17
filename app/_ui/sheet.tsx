"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A panel that slides up from the bottom (centred on wide screens). Built on the
// browser's own <dialog>, which traps keyboard focus, closes on Escape and makes
// the page behind it inert. Tapping the dimmed backdrop closes it too.
export function Sheet({
  open,
  onClose,
  title,
  action,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  action?: ReactNode; // e.g. a "Done" button in the header
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // React state decides; the dialog follows (showModal is what makes it modal).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      className="sheet"
      // Escape: let React close it, so state and the dialog never disagree.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself (not its content) is the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <h2 id="sheet-title" className="title-card">
            {title}
          </h2>
          {action}
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
