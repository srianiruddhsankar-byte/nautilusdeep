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
          A study timer with an ocean tank: focus for a while and a fish hatches, keep at it and your tank fills up.
          Nothing dies if you take a day off.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <SignInButton />
        {/* searchParams is per-request data, so it goes behind Suspense. */}
        <Suspense>
          <ErrorMessage searchParams={searchParams} />
        </Suspense>
      </div>
      {/* The first questions people have, answered before they ask. */}
      <ul className="flex flex-col gap-2 text-sm text-muted">
        <li>Google sign-in keeps your progress on every device, with no password to remember.</li>
        <li>Works in any browser on phone or laptop, and installs like an app. No app store needed.</li>
        <li>A nautilus is a deep-sea creature. One arrives in your tank after 100 hours.</li>
      </ul>
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
