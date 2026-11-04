"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { welcome } from "@/copy/strings";

type Phase = "idle" | "sending" | "sent" | "verifying";

async function post(path: string, body: Record<string, string>): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function WelcomeForm() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const awaitingCode = phase === "sent" || phase === "verifying";

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setMessage(null);
    setPhase("sending");
    const res = await post("/auth/send-code", { email }).catch(() => null);
    if (res?.ok) {
      setCode("");
      setPhase("sent");
      return;
    }
    setPhase(awaitingCode ? "sent" : "idle");
    if (res?.status === 400) setMessage(welcome.invalidEmail);
    else if (res?.status === 429) setMessage(welcome.rateLimited);
    else setMessage(welcome.unavailable);
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setPhase("verifying");
    const res = await post("/auth/verify-code", { email, code }).catch(() => null);
    if (res?.ok) {
      const next = res.data.redirect;
      window.location.assign(typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      return;
    }
    setPhase("sent");
    setMessage(res?.status === 429 ? welcome.rateLimited : welcome.codeInvalid);
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={sendCode} className="flex flex-col gap-2" noValidate>
        <Label htmlFor="email">{welcome.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {!awaitingCode ? (
          <Button type="submit" disabled={phase === "sending"} className="mt-2">
            {phase === "sending" ? welcome.sending : welcome.sendCode}
          </Button>
        ) : null}
      </form>

      <div aria-live="polite" className="flex flex-col gap-2 text-[16px]">
        {awaitingCode ? <p>{welcome.sent}</p> : null}
        {message ? (
          <p role="alert" className="border-[3px] border-ink bg-nq-fill p-3 text-ink">
            {message}
          </p>
        ) : null}
      </div>

      {awaitingCode ? (
        <form onSubmit={verify} className="flex flex-col gap-2" noValidate>
          <Label htmlFor="code">{welcome.codeLabel}</Label>
          <Input
            id="code"
            name="code"
            type="text"
            mono
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={12}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="tracking-widest"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <Button type="submit" disabled={phase === "verifying"}>
              {phase === "verifying" ? welcome.verifying : welcome.signIn}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void sendCode()}>
              {welcome.resend}
            </Button>
          </div>
        </form>
      ) : null}

      <p className="text-[16px] text-muted">{welcome.privacy}</p>
    </div>
  );
}
