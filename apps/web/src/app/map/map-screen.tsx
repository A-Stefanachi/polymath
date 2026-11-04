"use client";

import type { components } from "@polymath/shared-types";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { PixelIcon } from "@/components/pixel-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/ui/load-state";
import { ScreenTitle } from "@/components/ui/screen-title";
import { SKILL_STATE_LOOK, StatusChip, type SkillState } from "@/components/ui/status-chip";
import { skillMap as t } from "@/copy/strings";
import { cn } from "@/lib/utils";
import { nodeName } from "@/lib/views/names";
import {
  buildMapSkills,
  defaultNode,
  filterSkills,
  listOrder,
  nodesOf,
  startedCount,
  toMapEdges,
  trailOrder,
  type Filters,
  type MapEdge,
  type MapSkill,
} from "@/lib/views/skill-map";
import { getJson, useLoad } from "@/lib/views/use-load";
import { SkillDetail, type Reasons } from "./skill-detail";

type Graph = components["schemas"]["Graph"];
type Frontier = components["schemas"]["Frontier"];

async function loadMap() {
  const [graph, frontier] = await Promise.all([getJson<Graph>("/api/v1/graph"), getJson<Frontier>("/api/v1/frontier")]);
  return { skills: buildMapSkills(graph, frontier, new Date()), edges: toMapEdges(graph) };
}

const LEGEND: SkillState[] = ["reviewing", "learning", "ready", "locked", "mastered", "refresher"];
// The trail winds: start, centre, end, centre (Map mockup).
const WIND = ["items-start", "items-center", "items-end", "items-center"] as const;
// Tiles use a different icon for "ready" than the chip does, as in the approved mockup.
const TILE_ICON = { ready: "elec" } as const;

const chip = (pressed: boolean) =>
  cn(
    "inline-flex min-h-12 items-center border-[3px] border-ink px-3 text-[16px] font-semibold",
    pressed ? "bg-ink text-bg" : "bg-surface text-ink shadow-px-sm",
  );

export function MapScreen() {
  const [state, reload] = useLoad(loadMap);
  return (
    <>
      {state.status === "ready" ? <Loaded skills={state.data.skills} edges={state.data.edges} /> : <Header />}
      {state.status === "loading" ? <LoadingBlock /> : null}
      {state.status === "error" ? <ErrorBlock offline={state.offline} onRetry={reload} /> : null}
    </>
  );
}

function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <ScreenTitle>{t.title}</ScreenTitle>
      {children}
    </header>
  );
}

function Loaded({ skills, edges }: { skills: MapSkill[]; edges: MapEdge[] }) {
  const [view, setView] = useState<"trail" | "list">("trail");
  const [filters, setFilters] = useState<Filters>(() => ({ node: defaultNode(skills), readyNow: false, dueNow: false, query: "" }));
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, Reasons>>({});

  const byKey = useMemo(() => new Map(skills.map((s) => [s.key, s])), [skills]);
  const shown = useMemo(() => filterSkills(skills, filters), [skills, filters]);
  const ordered = useMemo(() => (view === "trail" ? trailOrder(shown, edges) : listOrder(shown)), [view, shown, edges]);
  const scope = filters.node === null ? skills : skills.filter((s) => s.node === filters.node);

  const fetchReasons = useCallback((key: string) => {
    setReasons((r) => ({ ...r, [key]: { status: "loading" } }));
    getJson<{ blocked_by?: string[] }>(`/api/v1/skills/${key}`).then(
      (d) => setReasons((r) => ({ ...r, [key]: { status: "ready", keys: d.blocked_by ?? [] } })),
      () => setReasons((r) => ({ ...r, [key]: { status: "error" } })),
    );
  }, []);

  if (skills.length === 0) {
    return (
      <>
        <Header />
        <EmptyBlock>
          <p>{t.empty}</p>
        </EmptyBlock>
      </>
    );
  }

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  // Opening a locked skill asks the scheduler (getSkill.blocked_by) what it needs; the answer is kept for the row.
  const toggle = (key: string) => {
    setOpenKey((k) => (k === key ? null : key));
    if (byKey.get(key)?.state === "locked" && reasons[key]?.status !== "ready") fetchReasons(key);
  };

  const rowHint = (s: MapSkill): string | undefined => {
    const r = reasons[s.key];
    if (s.state !== "locked" || r?.status !== "ready" || r.keys.length === 0) return undefined;
    return t.needs(r.keys.map((k) => byKey.get(k)?.title ?? k));
  };

  const detail = (s: MapSkill) =>
    openKey === s.key ? <SkillDetail skill={s} byKey={byKey} edges={edges} id={`detail-${s.key}`} reasons={reasons[s.key]} onRetry={() => fetchReasons(s.key)} /> : null;

  return (
    <>
      <Header>
        <p className="text-body text-muted">
          {filters.node === null ? "" : `${nodeName(filters.node)} · `}
          {t.intro(startedCount(scope), scope.length)}
        </p>
      </Header>

      <div role="group" aria-label={t.viewLabel} className="flex gap-3">
        <button type="button" aria-pressed={view === "trail"} onClick={() => setView("trail")} className={chip(view === "trail")}>
          {t.viewTrail}
        </button>
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={chip(view === "list")}>
          {t.viewList}
        </button>
      </div>

      <div role="group" aria-label={t.filtersLabel} className="flex flex-col gap-3">
        <div role="group" aria-label={t.nodeLabel} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={filters.node === null} onClick={() => set({ node: null })} className={chip(filters.node === null)}>
            {t.allAreas}
          </button>
          {nodesOf(skills).map((n) => (
            <button key={n} type="button" aria-pressed={filters.node === n} onClick={() => set({ node: n })} className={chip(filters.node === n)}>
              {nodeName(n)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={filters.readyNow} onClick={() => set({ readyNow: !filters.readyNow })} className={chip(filters.readyNow)}>
            {t.readyNow}
          </button>
          <button type="button" aria-pressed={filters.dueNow} onClick={() => set({ dueNow: !filters.dueNow })} className={chip(filters.dueNow)}>
            {t.dueNow}
          </button>
        </div>
        <Input type="search" aria-label={t.searchLabel} placeholder={t.searchPlaceholder} value={filters.query} onChange={(e) => set({ query: e.target.value })} />
      </div>

      <ul aria-label={t.legendLabel} className="flex flex-wrap gap-x-4 gap-y-2 text-[14px]">
        {LEGEND.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("inline-block size-4 border-2 border-ink", SKILL_STATE_LOOK[s].box)} />
            {SKILL_STATE_LOOK[s].label}
          </li>
        ))}
      </ul>

      {ordered.length === 0 ? (
        <EmptyBlock>
          <p>{t.noMatch}</p>
          <div>
            <Button type="button" variant="secondary" size="md" onClick={() => setFilters({ node: null, readyNow: false, dueNow: false, query: "" })}>
              {t.clearFilters}
            </Button>
          </div>
        </EmptyBlock>
      ) : view === "trail" ? (
        <ol aria-label={t.trailLabel} className="flex list-none flex-col bg-[radial-gradient(var(--muted)_1px,transparent_1px)] [background-size:12px_12px] px-1 py-2">
          {ordered.map((s, i) => {
            const look = SKILL_STATE_LOOK[s.state];
            const hint = rowHint(s);
            const right = WIND[i % WIND.length] === "items-end";
            return (
              <li key={s.key} data-skill-key={s.key} data-state={s.state} className={cn("flex flex-col gap-3", WIND[i % WIND.length])}>
                {i > 0 ? <span aria-hidden="true" className="mx-7 h-3.5 w-1 [background-image:linear-gradient(var(--ink)_50%,transparent_50%)] [background-size:4px_8px]" /> : null}
                <button
                  type="button"
                  aria-expanded={openKey === s.key}
                  aria-controls={`detail-${s.key}`}
                  onClick={() => toggle(s.key)}
                  className={cn("flex min-h-14 items-center gap-2.5 bg-transparent text-left text-ink", right && "flex-row-reverse text-right")}
                >
                  <span className={cn("flex size-14 shrink-0 items-center justify-center border-[3px] border-ink", look.box, s.state !== "locked" && "shadow-px-sm")}>
                    <PixelIcon name={s.state === "ready" ? TILE_ICON.ready : look.icon} size={28} />
                  </span>
                  <span className="flex max-w-[190px] flex-col bg-bg px-1.5 py-0.5">
                    <span className="text-[16px] leading-[21px] font-bold">{s.title}</span>
                    <span className="text-[14px] leading-[19px] text-muted">{hint ? `${s.word}: ${hint}` : s.word}</span>
                  </span>
                </button>
                {detail(s)}
              </li>
            );
          })}
        </ol>
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col gap-3">
          {ordered.map((s) => {
            const hint = rowHint(s);
            return (
              <li key={s.key} data-skill-key={s.key} data-state={s.state} className="flex flex-col gap-3">
                <button
                  type="button"
                  aria-expanded={openKey === s.key}
                  aria-controls={`detail-${s.key}`}
                  onClick={() => toggle(s.key)}
                  className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-[3px] border-ink bg-surface px-3 py-2 text-left text-ink"
                >
                  <span className="flex flex-col">
                    <span className="text-[16px] font-bold">{s.title}</span>
                    <span className="text-[14px] text-muted">{nodeName(s.node)}</span>
                  </span>
                  <StatusChip state={s.state} label={s.word} {...(hint ? { why: hint } : {})} />
                </button>
                {detail(s)}
              </li>
            );
          })}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">
        {t.shown(ordered.length)}
      </p>
    </>
  );
}
