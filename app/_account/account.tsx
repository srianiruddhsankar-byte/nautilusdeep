import Link from "next/link";
import { redirect } from "next/navigation";
import { CONTACT_EMAIL } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";
import { Card } from "../_ui/card";
import { SignOutButton } from "./sign-out";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Who's signed in, your data and the way out. Reads the login cookie, so the
// Account page renders it inside <Suspense>.
export async function Account() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already guards this page; this is a second line of defense.
  if (!user) redirect("/login");

  return (
    <>
      <Card as="section" aria-labelledby="signed-in-title" className="gap-4">
        <h2 id="signed-in-title" className="title-card">
          Signed in
        </h2>
        <p className="text-sm">
          <span className="text-muted">Signed in with Google as </span>
          <span className="font-semibold break-all">{user.email}</span>
        </p>
        <SignOutButton signOut={signOut} />
      </Card>

      <Card as="section" aria-labelledby="data-title" className="gap-3 leading-relaxed">
        <h2 id="data-title" className="title-card">
          Your data
        </h2>
        <p className="text-sm text-muted">
          Only you can see your sessions, tasks and tank. Nothing is sold or shared, and there are no ads.
        </p>
        <Link
          href="/privacy"
          className="-ml-1 inline-flex min-h-11 items-center self-start px-1 font-semibold text-primary"
        >
          Privacy policy ›
        </Link>
        <p className="text-sm text-muted">
          To delete your account and everything in it, email{" "}
          <a className="font-semibold text-primary underline underline-offset-2 break-all" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Card>
    </>
  );
}
