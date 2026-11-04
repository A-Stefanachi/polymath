"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { consent as t } from "@/copy/strings";

export function ConsentForm({ version }: { version: string }) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function choose(granted: boolean) {
    setSaving(true);
    setFailed(false);
    const res = await fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ consents: { research: { version, granted } } }),
    }).catch(() => null);
    if (res?.ok) return window.location.assign("/");
    setSaving(false);
    setFailed(true);
  }

  return (
    <div className="flex flex-col gap-3">
      {failed ? (
        <p role="alert" className="border-[3px] border-ink bg-nq-fill p-3 text-[16px] text-ink">
          {t.saveFailed}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={saving} onClick={() => void choose(true)}>
          {saving ? t.saving : t.accept}
        </Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void choose(false)}>
          {t.decline}
        </Button>
      </div>
    </div>
  );
}
