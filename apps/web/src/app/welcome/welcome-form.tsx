"use client";

import { useState, type FormEvent } from "react";
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
    <div className="flex flex-col gap-4">
      <form onSubmit={sendCode} className="flex flex-col gap-2" noValidate>
        <label htmlFor="email" className="text-sm font-medium">
          {welcome.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border px-3 py-2"
        />
        {!awaitingCode ? (
          <button type="submit" disabled={phase === "sending"} className="rounded-md border px-3 py-2 font-medium">
            {phase === "sending" ? welcome.sending : welcome.sendCode}
          </button>
        ) : null}
      </form>

      <div aria-live="polite" className="flex flex-col gap-2 text-sm">
        {awaitingCode ? <p>{welcome.sent}</p> : null}
        {message ? <p role="alert">{message}</p> : null}
      </div>

      {awaitingCode ? (
        <form onSubmit={verify} className="flex flex-col gap-2" noValidate>
          <label htmlFor="code" className="text-sm font-medium">
            {welcome.codeLabel}
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={12}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-md border px-3 py-2 font-mono tracking-widest"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={phase === "verifying"} className="rounded-md border px-3 py-2 font-medium">
              {phase === "verifying" ? welcome.verifying : welcome.signIn}
            </button>
            <button type="button" onClick={() => void sendCode()} className="rounded-md border px-3 py-2">
              {welcome.resend}
            </button>
          </div>
        </form>
      ) : null}

      <p className="text-sm">{welcome.privacy}</p>
    </div>
  );
}
