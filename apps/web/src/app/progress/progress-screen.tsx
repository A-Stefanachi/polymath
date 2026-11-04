"use client";

import type { components } from "@polymath/shared-types";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ErrorBlock, LoadingBlock } from "@/components/ui/load-state";
import { ScreenTitle } from "@/components/ui/screen-title";
import { progressScreen as t } from "@/copy/strings";
import { formatDate, formatDay } from "@/lib/views/format";
import { nodeName, projectLevel, projectName } from "@/lib/views/names";
import { isEmpty, nextArtifact, percentOf, stateRows } from "@/lib/views/progress";
import { getJson, useLoad } from "@/lib/views/use-load";

type Progress = components["schemas"]["Progress"];

// One call feeds the whole screen (BL-0190, 00a J8).
const loadProgress = () => getJson<Progress>("/api/v1/progress");

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="font-label text-[14px] tracking-[0.04em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

const TH = "border-b-[3px] border-ink px-2 py-2 text-left text-[15px] font-bold";
const TD = "border-b-2 border-muted px-2 py-2 align-top";

export function ProgressScreen() {
  const [state, reload] = useLoad(loadProgress);
  if (state.status === "loading")
    return (
      <>
        <p className="font-label text-[13px] tracking-[0.04em] text-muted uppercase">{t.eyebrow}</p>
        <ScreenTitle>{t.loadingTitle}</ScreenTitle>
        <LoadingBlock />
      </>
    );
  if (state.status === "error")
    return (
      <>
        <ScreenTitle>{t.loadingTitle}</ScreenTitle>
        <ErrorBlock offline={state.offline} onRetry={reload} />
      </>
    );
  return <Loaded p={state.data} />;
}

function Loaded({ p }: { p: Progress }) {
  const artifact = nextArtifact(p);
  const empty = isEmpty(p);
  return (
    <>
      <p className="font-label text-[13px] tracking-[0.04em] text-muted uppercase">{t.eyebrow}</p>
      {/* The first heading names the next competence artifact (S15 AC 5). */}
      <ScreenTitle data-testid="next-artifact">{artifact.heading}</ScreenTitle>
      {empty ? (
        <Card>
          <p>{t.empty}</p>
        </Card>
      ) : (
        <>
          {artifact.remaining.length > 0 ? (
            <ul className="flex list-disc flex-col gap-1 pl-6">
              {artifact.remaining.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <SkillsByState p={p} />
          <WorkingLevel p={p} />
          <UnaidedChecks p={p} />
          <TimeSection p={p} />
          <Projects p={p} />
          <Refresher p={p} />
        </>
      )}
    </>
  );
}

function SkillsByState({ p }: { p: Progress }) {
  return (
    <Section id="by-state" title={t.skillsByState}>
      <table className="w-full border-collapse">
        <caption className="sr-only">{t.skillsByStateCaption}</caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>
              {t.stateColumn}
            </th>
            <th scope="col" className={`${TH} text-right`}>
              {t.countColumn}
            </th>
          </tr>
        </thead>
        <tbody>
          {stateRows(p).map((r) => (
            <tr key={r.label}>
              <th scope="row" className={`${TD} text-left ${r.sub ? "pl-6 font-normal" : "font-semibold"}`}>
                {r.label}
              </th>
              <td className={`${TD} text-right font-mono`}>{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function WorkingLevel({ p }: { p: Progress }) {
  const nodes = p.nodes.filter((n) => n.l1_scope_skills > 0);
  return (
    <Section id="working" title={t.working}>
      <table className="w-full border-collapse">
        <caption className="sr-only">{t.workingCaption}</caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>
              {t.areaColumn}
            </th>
            <th scope="col" className={TH}>
              {t.skillsColumn}
            </th>
            <th scope="col" className={TH}>
              {t.statusColumn}
            </th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => (
            <tr key={n.node} data-node={n.node}>
              <th scope="row" className={`${TD} text-left font-semibold`}>
                {nodeName(n.node)}
              </th>
              <td className={TD}>
                {t.skillsOf(n.l1_scope_at_l1, n.l1_scope_skills)}
                <span className="block text-[15px] text-muted">
                  {n.l1_gate_project
                    ? t.projectLine(
                        t.stepsOf(n.l1_gate_project.steps_done, n.l1_gate_project.steps_total),
                        t.evidenceOf(n.l1_gate_project.evidence_accepted, n.l1_gate_project.evidence_required),
                      )
                    : t.noProject}
                </span>
              </td>
              <td className={TD}>{n.l1_working ? t.workingYes : t.workingNo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details className="border-[3px] border-ink bg-surface p-3">
        <summary className="min-h-12 cursor-pointer py-3 font-semibold">{t.howChecked}</summary>
        <div className="flex flex-col gap-3 pb-2">
          {t.howCheckedBody.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="font-semibold">{t.tierDefinitions}</p>
          <ul className="flex list-disc flex-col gap-1 pl-6">
            <li>{t.tierL0}</li>
            <li>{t.tierL1}</li>
          </ul>
        </div>
      </details>
    </Section>
  );
}

function UnaidedChecks({ p }: { p: Progress }) {
  const c = p.checkpoints;
  const gap = c.aided_vs_unaided;
  return (
    <Section id="unaided" title={t.unaided}>
      {c.recent.length === 0 ? (
        <p>{t.unaidedNone}</p>
      ) : (
        <table className="w-full border-collapse">
          <caption className="sr-only">{t.unaidedCaption}</caption>
          <thead>
            <tr>
              <th scope="col" className={TH}>
                {t.dateColumn}
              </th>
              <th scope="col" className={TH}>
                {t.resultColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {c.recent.map((r) => (
              <tr key={r.checkpoint_id}>
                <th scope="row" className={`${TD} text-left font-semibold`}>
                  {formatDay(new Date(r.completed_at), p.timezone)}
                </th>
                <td className={TD}>{t.checkResult(r.correct, r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {gap ? (
        <div data-testid="gap-line" className="flex flex-col gap-1">
          <p className="font-semibold">{t.gapLine(percentOf(gap.aided), percentOf(gap.unaided))}</p>
          <p className="text-[15px] text-muted">{t.gapCounts(`${String(gap.aided.correct)} of ${String(gap.aided.total)}`, `${String(gap.unaided.correct)} of ${String(gap.unaided.total)}`)}</p>
        </div>
      ) : null}
    </Section>
  );
}

function TimeSection({ p }: { p: Progress }) {
  const top = Math.max(p.week.minutes_target, ...p.week.history.map((w) => w.minutes_done), 1);
  return (
    <Section id="time" title={t.time}>
      <p className="font-semibold">{t.timeThisWeek(p.week.minutes_done, p.week.minutes_target)}</p>
      {/* The bars repeat the table below them; only the table is read out. */}
      <div aria-hidden="true" className="flex h-24 items-end gap-1.5 border-b-[3px] border-ink">
        {p.week.history.map((w) => (
          <div key={w.start_date} className="flex-1 border-[3px] border-b-0 border-ink bg-primary" style={{ height: `${String(Math.max(2, Math.round((100 * w.minutes_done) / top)))}%` }} />
        ))}
      </div>
      <table className="w-full border-collapse">
        <caption className="sr-only">{t.timeHistoryCaption}</caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>
              {t.weekColumn}
            </th>
            <th scope="col" className={`${TH} text-right`}>
              {t.minutesColumn}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...p.week.history].reverse().map((w) => (
            <tr key={w.start_date}>
              <th scope="row" className={`${TD} text-left font-semibold`}>
                {formatDate(w.start_date)}
              </th>
              <td className={`${TD} text-right font-mono`}>{w.minutes_done}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function Projects({ p }: { p: Progress }) {
  const ordered = [...p.projects].sort((a, b) => (a.project_key < b.project_key ? -1 : 1));
  return (
    <Section id="projects" title={t.projects}>
      {ordered.length === 0 ? (
        <p>{t.projectsNone}</p>
      ) : (
        <table className="w-full border-collapse">
          <caption className="sr-only">{t.projectsCaption}</caption>
          <thead>
            <tr>
              <th scope="col" className={TH}>
                {t.levelColumn}
              </th>
              <th scope="col" className={TH}>
                {t.projectColumn}
              </th>
              <th scope="col" className={TH}>
                {t.statusColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((pr) => (
              <tr key={pr.user_project_id}>
                <th scope="row" className={`${TD} text-left font-semibold`}>
                  {projectLevel(pr.project_key)}
                </th>
                <td className={TD}>{projectName(pr.project_key)}</td>
                <td className={TD}>
                  {t.projectStatus[pr.status]}
                  <span className="block text-[15px] text-muted">{t.stepsOf(pr.steps_done, pr.steps_total)}</span>
                  {pr.evidence_pending_review ? <span className="block text-[15px] text-muted">{t.pendingReview(pr.evidence_pending_review)}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function Refresher({ p }: { p: Progress }) {
  return (
    <Section id="refresher" title={t.refresher}>
      {p.decayed.length === 0 ? (
        <p>{t.refresherNone}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {p.decayed.map((d) => (
              <li key={d.skill_key} className="border-[3px] border-dashed border-ink bg-surface p-3">
                <span className="font-semibold">{d.title}</span>
                <span className="block text-[15px] text-muted">{d.last_review_at ? t.refresherLastReview(formatDay(new Date(d.last_review_at), p.timezone)) : t.refresherNeverReviewed}</span>
              </li>
            ))}
          </ul>
          <Link href="/map" className="font-semibold text-primary underline underline-offset-4">
            {t.refresherView}
          </Link>
        </>
      )}
    </Section>
  );
}
