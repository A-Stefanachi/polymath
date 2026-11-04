"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScreenTitle } from "@/components/ui/screen-title";
import { onboarding as t } from "@/copy/strings";

type Initial = { displayName: string; timezone: string; weeklyMinutes: number; alreadyOnboarded: boolean };
const STEPS = 3;
const LEGEND = "text-lg font-bold";
const HELP = "text-[16px] text-muted";

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
    <form onSubmit={step < STEPS ? next : finish} className="flex flex-col gap-5" noValidate>
      <ScreenTitle>{t.title}</ScreenTitle>
      <div className="flex flex-col gap-2">
        <p aria-live="polite" className="font-mono text-base font-semibold">
          {t.progress(step, STEPS)}
        </p>
        <div aria-hidden="true" className="grid grid-cols-3 gap-1">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`h-3 border-2 border-ink ${i < step - 1 ? "bg-primary" : i === step - 1 ? "bg-coin" : "bg-transparent"}`} />
          ))}
        </div>
      </div>
      {step === 1 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className={`${LEGEND} mb-2`}>{t.goalHeading}</legend>
          <p>{t.goal}</p>
          <p className={HELP}>{t.goalNote}</p>
          <label className="flex min-h-12 items-center gap-3 text-[16px]">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="size-6 shrink-0 accent-primary" />
            {t.adultLabel}
          </label>
        </fieldset>
      ) : null}
      {step === 2 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className={`${LEGEND} mb-2`}>{t.timeHeading}</legend>
          <Label htmlFor="hours">{t.hoursLabel}</Label>
          <Input id="hours" type="number" mono inputMode="decimal" min={1} max={20} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
          <p className={HELP}>{t.hoursHelp}</p>
        </fieldset>
      ) : null}
      {step === 3 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className={`${LEGEND} mb-2`}>{t.aboutHeading}</legend>
          <Label htmlFor="name">{t.nameLabel}</Label>
          <Input id="name" type="text" maxLength={80} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} />
          <Label htmlFor="zone" className="mt-2">
            {t.zoneLabel}
          </Label>
          <Input id="zone" type="text" autoComplete="off" value={zone} onChange={(e) => setZone(e.target.value)} />
          <p className={HELP}>{t.zoneHelp}</p>
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="border-[3px] border-ink bg-nq-fill p-3 text-[16px] text-ink">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
            {t.back}
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {step < STEPS ? t.next : saving ? t.saving : t.finish}
        </Button>
      </div>
    </form>
  );
}
