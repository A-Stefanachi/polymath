import { PixelIcon } from "@/components/pixel-icon";
import { ScreenTitle } from "@/components/ui/screen-title";
import { welcome } from "@/copy/strings";
import { WelcomeForm } from "./welcome-form";

// S01 Welcome and sign-in (doc 09). `error=link` comes from /auth/callback.
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-4 py-8 outline-none">
      <ScreenTitle className="flex items-center gap-3">
        <PixelIcon name="micro" size={32} className="text-primary" />
        {welcome.title}
      </ScreenTitle>
      <p>{welcome.description}</p>
      {error === "link" ? (
        <p role="alert" className="border-[3px] border-ink bg-nq-fill p-3 text-[16px] text-ink">
          {welcome.linkInvalid}
        </p>
      ) : null}
      <WelcomeForm />
    </main>
  );
}
