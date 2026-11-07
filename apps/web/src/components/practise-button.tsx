"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lists } from "@/copy/strings";
import { currentContext, startSession, type StartBody } from "@/lib/views/start-session";

type Props = {
  label: string;
  /** Accessible name when the visible label is not enough on its own (a list of identical buttons). */
  name?: string;
  body: Omit<StartBody, "context">;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
};

/** Builds a session and opens it (`/session/[id]`). A refusal is explained in words under the button. */
export function PractiseButton({ label, name, body, variant = "secondary", size = "md" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"open" | "pool" | "focus" | "capped" | "failed" | null>(null);

  async function start() {
    setBusy(true);
    setMessage(null);
    const result = await startSession({ ...body, context: currentContext() });
    if (result.ok) {
      router.push(`/session/${result.id}`);
      return;
    }
    setMessage(result.reason);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant={variant} size={size} disabled={busy} onClick={() => void start()} {...(name ? { "aria-label": name } : {})}>
        {busy ? lists.starting : label}
      </Button>
      <div aria-live="polite">
        {message === "open" ? (
          <p className="text-[16px]">
            {lists.sessionOpen}{" "}
            <Link href="/" className="font-semibold text-primary underline underline-offset-4">
              {lists.sessionOpenLink}
            </Link>
          </p>
        ) : null}
        {message === "pool" ? <p className="text-[16px]">{lists.poolEmpty}</p> : null}
        {message === "focus" ? <p className="text-[16px]">{lists.focusUnavailable}</p> : null}
        {message === "capped" ? <p className="text-[16px]">{lists.newSkillCapped}</p> : null}
        {message === "failed" ? <p className="text-[16px]">{lists.startFailed}</p> : null}
      </div>
    </div>
  );
}
