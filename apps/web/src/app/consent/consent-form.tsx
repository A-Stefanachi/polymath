"use client";

import { useState } from "react";
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
    <div className="flex flex-col gap-2">
      {failed ? (
        <p role="alert" className="text-sm">
          {t.saveFailed}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={() => void choose(true)} className="rounded-md border px-3 py-2 font-medium">
          {saving ? t.saving : t.accept}
        </button>
        <button type="button" disabled={saving} onClick={() => void choose(false)} className="rounded-md border px-3 py-2">
          {t.decline}
        </button>
      </div>
    </div>
  );
}
