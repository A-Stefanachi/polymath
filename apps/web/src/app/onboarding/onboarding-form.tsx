"use client";

import { useState, type FormEvent } from "react";
import { onboarding as t } from "@/copy/strings";

type Initial = { displayName: string; timezone: string; weeklyMinutes: number; alreadyOnboarded: boolean };
const STEPS = 3;

// A stored zone of "UTC" is the database default, so the device's zone is offered instead.
function detectZone(stored: string): string {
  if (stored !== "UTC") return stored;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || stored;
}

export function OnboardingForm({ initial }: { initial: Initial }) {
  const [step, setStep] = useState(1);
  const [hours, setHours] = useState(String(initial.weeklyMinutes / 60));
  const [zone, setZone] = useState(() => detectZone(initial.timezone));
  const [name, setName] = useState(initial.displayName);
  const [adult, setAdult] = useState(initial.alreadyOnboarded);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hoursNumber = Number(hours);
  const hoursOk = hours.trim() !== "" && Number.isFinite(hoursNumber) && hoursNumber >= 1 && hoursNumber <= 20;

  function next(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (step === 1 && !adult) return setError(t.adultRequired);
    if (step === 2 && !hoursOk) return setError(t.hoursInvalid);
    setStep(step + 1);
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!zone.trim()) return setError(t.zoneInvalid);
    setSaving(true);
    const res = await fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        display_name: name.trim(),
        timezone: zone.trim(),
        weekly_minutes_target: Math.round(hoursNumber * 60),
        adult_attested: true,
        onboarded: true,
      }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) return window.location.assign("/");
    const body = res ? ((await res.json().catch(() => ({}))) as { errors?: { field: string }[] }) : {};
    setError(body.errors?.some((e) => e.field === "timezone") ? t.zoneInvalid : body.errors?.length ? t.hoursInvalid : t.saveFailed);
  }

  return (
    <form onSubmit={step < STEPS ? next : finish} className="flex flex-col gap-4" noValidate>
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p aria-live="polite" className="text-sm">
        {t.progress(step, STEPS)}
      </p>
      {step === 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">{t.goalHeading}</legend>
          <p>{t.goal}</p>
          <p className="text-sm">{t.goalNote}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            {t.adultLabel}
          </label>
        </fieldset>
      ) : null}
      {step === 2 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">{t.timeHeading}</legend>
          <label htmlFor="hours" className="text-sm font-medium">
            {t.hoursLabel}
          </label>
          <input id="hours" type="number" inputMode="decimal" min={1} max={20} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} className="rounded-md border px-3 py-2" />
          <p className="text-sm">{t.hoursHelp}</p>
        </fieldset>
      ) : null}
      {step === 3 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">{t.aboutHeading}</legend>
          <label htmlFor="name" className="text-sm font-medium">
            {t.nameLabel}
          </label>
          <input id="name" type="text" maxLength={80} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border px-3 py-2" />
          <label htmlFor="zone" className="text-sm font-medium">
            {t.zoneLabel}
          </label>
          <input id="zone" type="text" autoComplete="off" value={zone} onChange={(e) => setZone(e.target.value)} className="rounded-md border px-3 py-2" />
          <p className="text-sm">{t.zoneHelp}</p>
        </fieldset>
      ) : null}
      {error ? <p role="alert" className="text-sm">{error}</p> : null}
      <div className="flex gap-2">
        {step > 1 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="rounded-md border px-3 py-2">
            {t.back}
          </button>
        ) : null}
        <button type="submit" disabled={saving} className="rounded-md border px-3 py-2 font-medium">
          {step < STEPS ? t.next : saving ? t.saving : t.finish}
        </button>
      </div>
    </form>
  );
}
