import { welcome } from "@/copy/strings";
import { WelcomeForm } from "./welcome-form";

// S01 Welcome and sign-in (doc 09). `error=link` comes from /auth/callback.
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">{welcome.title}</h1>
      <p>{welcome.description}</p>
      {error === "link" ? (
        <p role="alert" className="text-sm">
          {welcome.linkInvalid}
        </p>
      ) : null}
      <WelcomeForm />
    </main>
  );
}
