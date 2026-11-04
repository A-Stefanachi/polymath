import { redirect } from "next/navigation";
import { ScreenTitle } from "@/components/ui/screen-title";
import { consent as t } from "@/copy/strings";
import { nextPath } from "@/lib/auth/next-step";
import { CONSENT_VERSION } from "@/lib/profile/consent";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";

const SECTION = "flex flex-col gap-1";
const HEADING = "text-lg font-bold";

// Founder self-consent (BL-0028, FR-004). Shown until a research decision is recorded.
export default async function ConsentPage() {
  const next = await nextPath(await createSupabaseServerClient());
  if (next !== "/consent") redirect(next);
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-4 py-8 outline-none">
      <ScreenTitle>{t.title}</ScreenTitle>
      <p>{t.intro}</p>
      <section className={SECTION}>
        <h2 className={HEADING}>{t.loggedHeading}</h2>
        <p>{t.logged}</p>
      </section>
      <section className={SECTION}>
        <h2 className={HEADING}>{t.researchHeading}</h2>
        <p>{t.research}</p>
      </section>
      <section className={SECTION}>
        <h2 className={HEADING}>{t.whoHeading}</h2>
        <p>{t.who}</p>
      </section>
      <section className={SECTION}>
        <h2 className={HEADING}>{t.withdrawHeading}</h2>
        <p>{t.withdraw}</p>
      </section>
      <ConsentForm version={CONSENT_VERSION} />
    </main>
  );
}
