import type { ChangeEventHandler } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  readOnly?: boolean;
  /** Fixed unit shown in a box beside the field (doc 09 S08). Leave out when the learner types the unit. */
  unit?: string;
  help?: string;
  error?: string | null;
};

/** Numeric answer field: label, mono input at 22 px, optional unit box, help text. Presentational. */
export function NumericAnswer({ id, name, label, value, onChange, readOnly, unit, help, error }: Props) {
  const helpId = `${id}-help`;
  const unitId = `${id}-unit`;
  const describedBy = [help ? helpId : null, unit ? unitId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          name={name ?? id}
          mono
          inputMode="decimal"
          autoComplete="off"
          value={value}
          {...(onChange ? { onChange } : {})}
          readOnly={readOnly ?? !onChange}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        />
        {unit ? (
          <span id={unitId} className="inline-flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-ink bg-control font-mono text-xl font-semibold">
            {unit}
          </span>
        ) : null}
      </div>
      {help ? (
        <p id={helpId} className="text-[15px] leading-[22px] text-muted">
          {help}
        </p>
      ) : null}
      {error ? <p role="alert" className="text-[15px] leading-[22px] font-semibold text-nq">{error}</p> : null}
    </div>
  );
}
