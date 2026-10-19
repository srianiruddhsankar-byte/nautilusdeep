import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

// TODO: put the email address people should use to contact you about their data.
const CONTACT_EMAIL = "srianiruddhsankar@gmail.com";

export const metadata: Metadata = {
  title: "Privacy Policy – Deep Nautilus",
};

// Public page (see PUBLIC_PATHS in lib/supabase/proxy.ts) so Google can link to it.
// A reading page: one column at a comfortable line length, no nav bar (you may
// not be signed in).
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pt-8 pb-12 leading-relaxed">
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-semibold text-primary">
        ← Deep Nautilus
      </Link>
      <h1 className="title-page">Privacy policy</h1>
      <p className="eyebrow">Last updated: October 13, 2026</p>

      <p>
        Deep Nautilus is a small, non-commercial focus app built for a few friends. This page explains what data it
        uses and why.
      </p>

      <Section title="What we collect">
        <p>
          When you sign in with Google, we receive your name, email address and profile picture from your Google
          account. We do not access your Gmail, Drive, Calendar, contacts or any other Google data.
        </p>
        <p>
          As you use the app, we may store your focus sessions (start and end times, mode, and whether they were
          completed) to show you your stats.
        </p>
        <p>
          If you turn on notifications, we store your device&apos;s push address (from your browser) and, while a session
          runs, when its blocks and breaks end, so we can notify you. Notifications are delivered through your
          browser&apos;s push service (for example Google or Apple). Signing out removes the device.
        </p>
      </Section>

      <Section title="How we use it">
        <p>Only to sign you in and run the app for you. We do not sell your data, show ads, or share it with anyone.</p>
      </Section>

      <Section title="Where it is stored">
        <p>Data is stored with Supabase (authentication and database) and the app is hosted on Vercel.</p>
      </Section>

      <Section title="Deleting your data">
        <p>
          Email{" "}
          <a className="font-semibold text-primary underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          and your account and all its data will be deleted. You can also revoke the app&apos;s access at any time from
          your Google Account settings.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-5">
      <h2 className="title-card">{title}</h2>
      {children}
    </section>
  );
}
