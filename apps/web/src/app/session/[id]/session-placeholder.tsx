"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenTitle } from "@/components/ui/screen-title";
import { sessionPage as t } from "@/copy/strings";

type Loaded = { planned_min: number; tasks: unknown[]; status: string };

export function SessionPlaceholder({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetch(`/api/v1/sessions/${id}`)
      .then((res) => (res.ok ? (res.json() as Promise<Loaded>) : null))
      .then(setSession)
      .catch(() => setSession(null));
  }, [id]);

  async function leave() {
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/v1/sessions/${id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: "{}",
    }).catch(() => null);
    if (res?.ok) return router.push("/");
    setBusy(false);
    setError(true);
  }

  return (
    <>
      <ScreenTitle>{t.title}</ScreenTitle>
      <Card hero>
        <p>{t.body}</p>
        {session ? <p className="font-mono">{t.summary(session.tasks.length, session.planned_min)}</p> : null}
        {error ? (
          <p role="alert" className="font-semibold text-nq">
            {t.leaveError}
          </p>
        ) : null}
        <Button variant="secondary" size="md" onClick={() => void leave()} disabled={busy}>
          {busy ? t.leaving : t.leave}
        </Button>
      </Card>
    </>
  );
}
