import type { Metadata } from "next";
import Link from "next/link";

// TODO: put the email address people should use to contact you about their data.
const CONTACT_EMAIL = "srianiruddhsankar@gmail.com";

export const metadata: Metadata = {
  title: "Privacy Policy – Deep Nautilus",
};

// Public page (see PUBLIC_PATHS in lib/supabase/proxy.ts) so Google can link to it.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8 leading-relaxed">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: October 13, 2026</p>

      <p>
        Deep Nautilus is a small, non-commercial focus app built for a few
        friends. This page explains what data it uses and why.
      </p>

      <h2 className="mt-4 text-xl font-semibold">What we collect</h2>
      <p>
        When you sign in with Google, we receive your name, email address and
        profile picture from your Google account. We do not access your Gmail,
        Drive, Calendar, contacts or any other Google data.
      </p>
      <p>
        As you use the app, we may store your focus sessions (start and end
        times, mode, and whether they were completed) to show you your stats.
      </p>

      <h2 className="mt-4 text-xl font-semibold">How we use it</h2>
      <p>
        Only to sign you in and run the app for you. We do not sell your data,
        show ads, or share it with anyone.
      </p>

      <h2 className="mt-4 text-xl font-semibold">Where it is stored</h2>
      <p>
        Data is stored with Supabase (authentication and database) and the app
        is hosted on Vercel.
      </p>

      <h2 className="mt-4 text-xl font-semibold">Deleting your data</h2>
      <p>
        Email{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>{" "}
        and your account and all its data will be deleted. You can also revoke
        the app&apos;s access at any time from your Google Account settings.
      </p>

      <Link href="/" className="mt-6 text-sky-700 underline">
        ← Back to Deep Nautilus
      </Link>
    </main>
  );
}
