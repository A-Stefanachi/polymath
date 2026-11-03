import { redirect } from "next/navigation";
import { consent as t } from "@/copy/strings";
import { nextPath } from "@/lib/auth/next-step";
import { CONSENT_VERSION } from "@/lib/profile/consent";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";

// Founder self-consent (BL-0028, FR-004). Shown until a research decision is recorded.
export default async function ConsentPage() {
  const next = await nextPath(await createSupabaseServerClient());
  if (next !== "/consent") redirect(next);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p>{t.intro}</p>
      <section className="flex flex-col gap-1">
        <h2 className="font-medium">{t.loggedHeading}</h2>
        <p>{t.logged}</p>
      </section>
      <section className="flex flex-col gap-1">
        <h2 className="font-medium">{t.researchHeading}</h2>
        <p>{t.research}</p>
      </section>
      <section className="flex flex-col gap-1">
        <h2 className="font-medium">{t.whoHeading}</h2>
        <p>{t.who}</p>
      </section>
      <section className="flex flex-col gap-1">
        <h2 className="font-medium">{t.withdrawHeading}</h2>
        <p>{t.withdraw}</p>
      </section>
      <ConsentForm version={CONSENT_VERSION} />
    </main>
  );
}
