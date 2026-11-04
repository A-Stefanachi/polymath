import "katex/dist/katex.min.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MathText } from "@/components/math-text";
import { adminContent as t } from "@/copy/strings";
import { TEMPLATE_KEY, type ReviewItem, type TemplateView } from "@/lib/admin/review";
import { reviewStores, sessionUserId } from "@/lib/admin/session";
import { approveTemplateAction, retireItemAction } from "./actions";

export const dynamic = "force-dynamic";

const ITEMS_SHOWN = 5;
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const pretty = (v: unknown): string => JSON.stringify(v, null, 2);

function RetireForm({ itemId, suffix }: { itemId: string; suffix: string }) {
  return (
    <form action={retireItemAction} className="flex flex-col gap-2">
      <input type="hidden" name="item_id" value={itemId} />
      <Label htmlFor={`reason-${suffix}`}>{t.reason}</Label>
      <Input id={`reason-${suffix}`} name="reason" required minLength={5} maxLength={2000} autoComplete="off" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="retire_template" />
        {t.retireTemplate}
      </label>
      <Button type="submit" variant="outline" className="self-start">
        {t.retire}
      </Button>
    </form>
  );
}

function ItemCard({ item, index }: { item: ReviewItem; index: number }) {
  const r = item.rendered;
  const stem = typeof r["stem_md"] === "string" ? r["stem_md"] : typeof r["prompt_md"] === "string" ? r["prompt_md"] : "";
  const alt = typeof r["alt_text"] === "string" ? r["alt_text"] : null;
  return (
    <li>
      <Card>
        <h3 className="font-medium">
          {t.seed} {item.seed}, {t.itemStatus.toLowerCase()} {item.status}
        </h3>
        <section aria-labelledby={`stem-${index}`}>
          <h4 id={`stem-${index}`} className="text-sm font-medium">
            {t.statement}
          </h4>
          <p data-testid="item-statement">
            <MathText source={stem} />
          </p>
          {alt && <p className="text-sm">{alt}</p>}
        </section>
        <section aria-labelledby={`ref-${index}`}>
          <h4 id={`ref-${index}`} className="text-sm font-medium">
            {t.referenceAnswer}
          </h4>
          <pre className="overflow-x-auto text-sm" tabIndex={0}>
            {pretty(item.answer_key)}
          </pre>
        </section>
        {item.solution && (
          <section aria-labelledby={`sol-${index}`}>
            <h4 id={`sol-${index}`} className="text-sm font-medium">
              {t.solution}
            </h4>
            <pre className="overflow-x-auto text-sm" tabIndex={0}>
              {pretty(item.solution)}
            </pre>
          </section>
        )}
        <section aria-labelledby={`rep-${index}`}>
          <h4 id={`rep-${index}`} className="text-sm font-medium">
            {t.verificationReport}
          </h4>
          <pre className="overflow-x-auto text-sm" tabIndex={0}>
            {pretty(item.verification_report)}
          </pre>
        </section>
        <RetireForm itemId={item.id} suffix={String(index)} />
      </Card>
    </li>
  );
}

function Approve({ tpl }: { tpl: TemplateView }) {
  const approved = tpl.status === "verified" && tpl.review?.["template_sha256"] === tpl.sha256;
  if (approved) return <p data-testid="approved-state">{t.approvedState}</p>;
  if (tpl.status !== "needs_human_review") return null;
  return (
    <form action={approveTemplateAction} className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">{t.approveTitle}</h2>
      <p className="text-sm">{t.approveHelp}</p>
      <input type="hidden" name="template_key" value={tpl.key} />
      <input type="hidden" name="version" value={tpl.version} />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="hand_solve" />
        {t.handSolve}
      </label>
      <Label htmlFor="notes">{t.notes}</Label>
      <Input id="notes" name="notes" maxLength={2000} autoComplete="off" />
      <Button type="submit" className="self-start">
        {t.approve}
      </Button>
    </form>
  );
}

async function Detail({ templateKey }: { templateKey: string }) {
  const stores = reviewStores();
  const tpl = await stores.review.template(templateKey);
  if (!tpl) return <p role="status">{t.notices.not_found}</p>;
  const items = await stores.review.items(tpl.key, tpl.version, ITEMS_SHOWN);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="detail-title">
      <h2 id="detail-title" className="text-xl font-semibold">
        {tpl.key}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
        <dt>{t.version}</dt>
        <dd>{tpl.version}</dd>
        <dt>{t.skill}</dt>
        <dd>{tpl.skill_key}</dd>
        <dt>{t.grader}</dt>
        <dd>{tpl.grader_type}</dd>
        <dt>{t.automaticChecks}</dt>
        <dd>{tpl.fuzz_passed ? t.fuzzPassed : t.fuzzPending}</dd>
      </dl>
      <Approve tpl={tpl} />
      <h2 className="text-xl font-semibold">{t.itemsTitle}</h2>
      {items.length === 0 ? (
        <p>{t.itemsNone}</p>
      ) : (
        <>
          <p className="text-sm">{t.itemsMore}</p>
          <ol className="flex flex-col gap-4">
            {items.map((item, i) => (
              <ItemCard key={item.id} item={item} index={i} />
            ))}
          </ol>
        </>
      )}
      <Link href="/admin/content" className="underline">
        {t.back}
      </Link>
    </section>
  );
}

async function Queue() {
  const stores = reviewStores();
  const [queue, reports] = await Promise.all([stores.review.queue(), stores.reports.list({ status: "open", limit: 25 })]);
  return (
    <>
      <section className="flex flex-col gap-2" aria-labelledby="queue-title">
        <h2 id="queue-title" className="text-xl font-semibold">
          {t.queueTitle}
        </h2>
        {queue.length === 0 ? (
          <p>{t.queueEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {queue.map((q) => (
              <li key={`${q.key}-${q.version}`} className="flex flex-wrap items-center gap-x-3">
                <Link href={`/admin/content?template=${q.key}`} className="underline">
                  {t.open} {q.key}
                </Link>
                <span className="text-sm">
                  {t.version} {q.version}, {t.itemsCount.toLowerCase()} {q.item_count}, {t.automaticChecks.toLowerCase()}: {q.fuzz_passed ? t.fuzzPassed : t.fuzzPending}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2" aria-labelledby="reports-title">
        <h2 id="reports-title" className="text-xl font-semibold">
          {t.reportsTitle}
        </h2>
        {reports.length === 0 ? (
          <p>{t.reportsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {reports.map((r) => (
              <li key={r.id}>
                <Card>
                  <p className="text-sm">
                    {t.reportReason}: {r.reason}
                    {r.template_key ? `, ${r.template_key}` : ""}
                  </p>
                  {r.template_key && (
                    <Link href={`/admin/content?template=${r.template_key}`} className="underline">
                      {t.open} {r.template_key}
                    </Link>
                  )}
                  {r.item_id && <RetireForm itemId={r.item_id} suffix={`r${r.id}`} />}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const userId = await sessionUserId();
  const stores = reviewStores();
  // The proxy already answered 403 for non-admins; this is the second check of ADR-018.
  if (!userId || !(await stores.reports.isAdmin(userId))) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <p role="alert">{t.forbidden}</p>
      </main>
    );
  }
  const notice = one(params["notice"]);
  const noticeText = notice && Object.hasOwn(t.notices, notice) ? t.notices[notice as keyof typeof t.notices] : null;
  const template = one(params["template"]);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p>{t.intro}</p>
      {noticeText && <p role="status">{noticeText}</p>}
      {template && TEMPLATE_KEY.test(template) ? <Detail templateKey={template} /> : <Queue />}
    </main>
  );
}
