import Link from "next/link";
import { Suspense } from "react";
import { SignInButton } from "./sign-in-button";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Deep Nautilus</h1>
      <SignInButton />
      {/* searchParams is per-request data, so it goes behind Suspense. */}
      <Suspense>
        <ErrorMessage searchParams={searchParams} />
      </Suspense>
      <Link href="/privacy" className="text-sm text-gray-500 underline">
        Privacy Policy
      </Link>
    </main>
  );
}

async function ErrorMessage({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  return <p className="text-sm text-red-600">Sign-in failed. Please try again.</p>;
}
