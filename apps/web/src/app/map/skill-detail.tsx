import { PractiseButton } from "@/components/practise-button";
import { StatusChip } from "@/components/ui/status-chip";
import { lists, skillMap as t } from "@/copy/strings";
import { formatDay } from "@/lib/views/format";
import { practiseMinutes } from "@/lib/views/start-session";
import type { MapEdge, MapSkill } from "@/lib/views/skill-map";

/** The unmet hard prerequisites of a locked skill, as the scheduler computed them (getSkill.blocked_by, FR-013). */
export type Reasons = { status: "loading" } | { status: "error" } | { status: "ready"; keys: string[] };

export function SkillDetail({
  skill,
  byKey,
  edges,
  id,
  reasons,
  onRetry,
}: {
  skill: MapSkill;
  byKey: ReadonlyMap<string, MapSkill>;
  edges: readonly MapEdge[];
  id: string;
  reasons: Reasons | undefined;
  onRetry: () => void;
}) {
  const into = edges.filter((e) => e.to === skill.key);
  const title = (k: string) => byKey.get(k)?.title ?? k;
  const word = (k: string) => byKey.get(k)?.word ?? lists.stateNotStarted;

  return (
    <section id={id} aria-label={t.open(skill.title)} className="flex flex-col gap-3 border-[3px] border-ink bg-surface p-4" data-testid="skill-detail">
      <h2 className="text-[19px] font-bold">{skill.title}</h2>
      {skill.description ? <p>{skill.description}</p> : null}
      <p>
        <StatusChip state={skill.state} label={skill.word} />
      </p>
      {skill.state === "reviewing" ? <p>{skill.needsApplied ? t.appliedNote : t.reviewingNote}</p> : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="font-semibold">{t.tierReached}</dt>
        <dd>{skill.tier ?? t.tierNone}</dd>
        <dt className="font-semibold">{t.nextReview}</dt>
        <dd>{skill.due ? formatDay(skill.due) : t.noReviewDate}</dd>
      </dl>

      <div>
        <h3 className="font-semibold">{t.prerequisites}</h3>
        {into.length === 0 ? (
          <p>{t.prerequisitesNone}</p>
        ) : (
          <ul className="list-disc pl-6">
            {into.map((e) => (
              <li key={e.from}>
                {title(e.from)}: {word(e.from)}
                {e.strength === "soft" ? ` (${t.recommendedLabel.toLowerCase()})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {skill.state === "locked" ? (
        <div data-testid="why-locked">
          <h3 className="font-semibold">{t.whyLocked}</h3>
          {reasons === undefined || reasons.status === "loading" ? <p>{t.whyLockedLoading}</p> : null}
          {reasons?.status === "error" ? (
            <p>
              {t.whyLockedFailed}{" "}
              <button type="button" onClick={onRetry} className="min-h-12 font-semibold text-primary underline underline-offset-4">
                {lists.retry}
              </button>
            </p>
          ) : null}
          {reasons?.status === "ready" ? (
            reasons.keys.length === 0 ? (
              <p>{t.whyLockedNone}</p>
            ) : (
              <>
                <p>{t.whyLockedBody}</p>
                <ul className="list-disc pl-6" data-testid="unmet-prerequisites">
                  {reasons.keys.map((k) => {
                    const edge = edges.find((e) => e.from === k && e.to === skill.key);
                    return (
                      <li key={k} data-prerequisite-key={k}>
                        {title(k)}: {word(k)}
                        {edge && edge.minTier !== "L0" ? `, ${t.needsTier(edge.minTier)}` : ""}
                      </li>
                    );
                  })}
                </ul>
              </>
            )
          ) : null}
        </div>
      ) : null}

      {skill.practisable ? <PractiseButton label={t.practiseThis} name={`${t.practiseThis}: ${skill.title}`} body={{ available_minutes: practiseMinutes(skill.state), skill_focus: skill.key }} variant="primary" size="md" /> : null}
    </section>
  );
}
