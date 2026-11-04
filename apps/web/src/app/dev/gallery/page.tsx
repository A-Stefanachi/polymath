import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PIXEL_ICON_NAMES, PixelIcon } from "@/components/pixel-icon";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackPanel } from "@/components/ui/feedback-panel";
import { NumericAnswer } from "@/components/ui/numeric-answer";
import { ScreenTitle } from "@/components/ui/screen-title";
import { SessionTopBar } from "@/components/ui/session-top-bar";
import { StatusChip } from "@/components/ui/status-chip";
import { TaskCard } from "@/components/ui/task-card";
import { demoItem, gallery as t, ui } from "@/copy/strings";
import { ConfidenceDemo } from "./confidence-demo";

// Component gallery (BL-0058). Not linked from the app. It is public on purpose: it reads no data, shows only
// sample text and needs no sign-in, so a design review or a browser test can open it directly.
export const metadata: Metadata = { title: "Components", robots: { index: false, follow: false } };

const SWATCHES = [
  ["Paper", "bg-bg"],
  ["Surface", "bg-surface"],
  ["Ink", "bg-ink"],
  ["Muted", "bg-muted"],
  ["Primary", "bg-primary"],
  ["Correct", "bg-ok"],
  ["Not quite", "bg-nq"],
  ["Coin", "bg-coin"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `g-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <h2 id={id}className="font-label text-sm tracking-[0.04em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function GalleryPage() {
  return (
    <AppShell>
      <ScreenTitle>{t.title}</ScreenTitle>
      <p className="text-muted">{t.intro}</p>

      <Section title={t.colour}>
        <ul className="grid grid-cols-4 gap-2.5">
          {SWATCHES.map(([name, cls]) => (
            <li key={name} className="flex flex-col gap-1.5">
              <span className={`h-14 border-2 border-ink ${cls}`} />
              <span className="text-sm font-bold">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.buttons}>
        <div className="flex flex-wrap items-center gap-4">
          <Button>{t.primary}</Button>
          <Button variant="secondary">{t.secondary}</Button>
          <Button variant="inverse">{t.next}</Button>
          <Button variant="link" size="md">
            {demoItem.confidenceSkip}
          </Button>
          <Button disabled>{t.disabled}</Button>
        </div>
      </Section>

      <Section title={t.icons}>
        <ul className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
          {PIXEL_ICON_NAMES.map((name) => (
            <li key={name} className="flex flex-col items-center gap-1.5 border-2 border-ink bg-surface px-1 py-2.5">
              <PixelIcon name={name} size={32} />
              <span className="text-[13px] text-muted">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.states}>
        <div className="flex flex-wrap gap-3">
          <StatusChip state="reviewing" />
          <StatusChip state="learning" />
          <StatusChip state="ready" />
          <StatusChip state="locked" why={t.lockedWhy} />
        </div>
      </Section>

      <Section title={t.feedback}>
        <FeedbackPanel tone="correct" title={ui.correct} live={false}>
          <p>{t.correctBody}</p>
        </FeedbackPanel>
        <FeedbackPanel
          tone="not-quite"
          title={ui.notQuite}
          live={false}
          actions={
            <>
              <Button variant="secondary">{t.secondary}</Button>
              <Button variant="inverse" className="grow shadow-[4px_4px_0_var(--nq)]">
                {t.next}
              </Button>
            </>
          }
        >
          <p>{t.notQuiteBody}</p>
        </FeedbackPanel>
        <FeedbackPanel tone="info" title={t.infoTitle} live={false}>
          <p>{t.infoBody}</p>
        </FeedbackPanel>
      </Section>

      <Section title={t.session}>
        <Card className="gap-0 p-0">
          <SessionTopBar
            task={3}
            tasks={8}
            minutesDone={6}
            minutesTotal={15}
            pause={
              <Button variant="secondary" size="md" className="min-h-11 px-3.5 shadow-px-sm">
                {ui.pause}
              </Button>
            }
          />
          <div className="flex flex-col gap-4 bg-bg p-4">
            <TaskCard label={demoItem.title} eyebrow={demoItem.title}>
              <p className="max-w-[34ch] text-question sm:max-w-[60ch]">{t.sampleQuestion}</p>
              <NumericAnswer id="gallery-answer" label={demoItem.answerLabel} value="0.93" unit="V" help={t.sampleHelp} readOnly />
            </TaskCard>
            <Card>
              <ConfidenceDemo />
            </Card>
          </div>
        </Card>
      </Section>
    </AppShell>
  );
}
