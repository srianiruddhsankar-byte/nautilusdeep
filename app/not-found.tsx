import { ButtonLink } from "./_ui/button";
import { EmptyState } from "./_ui/feedback";

// Any address that doesn't exist: a calm note and the way home.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <EmptyState
        title="Nothing down here"
        action={
          <ButtonLink href="/" variant="primary">
            Back to your tank
          </ButtonLink>
        }
      >
        This page doesn&apos;t exist. It may have moved, or the link has a typo.
      </EmptyState>
    </main>
  );
}
