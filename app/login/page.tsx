import Link from "next/link";
import { Suspense } from "react";
import { SignInButton } from "./sign-in-button";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 p-6">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">A calm place to study</p>
        <h1 className="font-display text-[44px] leading-[1.05] font-medium tracking-[-0.02em]">Deep Nautilus</h1>
        <p className="text-muted">
          Focus for a while and a fish hatches. Keep at it and your tank fills up. Nothing dies while you&rsquo;re
          away.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <SignInButton />
        {/* searchParams is per-request data, so it goes behind Suspense. */}
        <Suspense>
          <ErrorMessage searchParams={searchParams} />
        </Suspense>
      </div>
      <Link href="/privacy" className="inline-flex min-h-11 items-center self-start text-sm text-muted underline">
        Privacy policy
      </Link>
    </main>
  );
}

async function ErrorMessage({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      Sign-in didn&rsquo;t work. Please try again.
    </p>
  );
}
