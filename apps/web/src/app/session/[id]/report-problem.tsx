"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { runner as t } from "@/copy/strings";

type State = "closed" | "open" | "sending" | "sent" | "failed";

/** "Report a problem" for the open item (BL-0056, POST /items/{item_id}/report). The note is free text and is only sent, never kept here. */
export function ReportProblem({ itemId }: { itemId: string }) {
  const [state, setState] = useState<State>("closed");
  const [reason, setReason] = useState("wrong_answer");
  const [note, setNote] = useState("");

  async function send(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    const res = await fetch(`/api/v1/items/${itemId}/report`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ reason, ...(note.trim() ? { note: note.trim() } : {}) }),
    }).catch(() => null);
    setState(res?.ok ? "sent" : "failed");
  }

  if (state === "sent") return <p role="status">{t.reportSent}</p>;
  if (state === "closed")
    return (
      <Button variant="link" size="md" className="self-start" onClick={() => setState("open")}>
        {t.report}
      </Button>
    );
  return (
    <Card>
      <form onSubmit={(e) => void send(e)} className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-lg font-bold">{t.reportTitle}</legend>
          {Object.entries(t.reportReasons).map(([value, text]) => (
            <label key={value} className="flex min-h-12 items-center gap-3">
              <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="size-5 accent-[var(--primary)]" />
              <span>{text}</span>
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1.5 text-[15px] font-semibold">
          {t.reportNote}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} className="border-[3px] border-ink bg-field p-2 text-[17px] font-normal text-ink" />
        </label>
        {state === "failed" && (
          <p role="alert" className="font-semibold text-nq">
            {t.reportFailed}
          </p>
        )}
        <div className="flex gap-2.5">
          <Button type="submit" size="md" disabled={state === "sending"}>
            {state === "sending" ? t.reportSending : t.reportSend}
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={() => setState("closed")}>
            {t.reportCancel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
