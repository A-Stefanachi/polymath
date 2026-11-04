// reportItem, retireItem, listItemReports, resolveItemReport (BL-0056; FR-066, US-026, doc 07 sections 7 and 8,
// 00a D5). Route handlers only call these. Contract spellings win over doc 07's category names: the
// OpenAPI/schema reason `wrong_answer` covers "answer_marked_wrong" and "answer_key_wrong" and quarantines at
// once; other reasons quarantine after three distinct reporters, or at once when the reporter is the admin.
// Quarantine = items.status 'needs_human_review', which the serve gate (canServe) never serves to a learner.
import type { components } from "@polymath/shared-types";
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { checkEvent } from "@/lib/events/emit.ts";
import { canServe } from "@/lib/items/serve.ts";
import { privilegedDb } from "@/server/privileged/db";
import { createServeStore, type ServeStore } from "@/server/privileged/item-store";
import { createReportStore, type ReportRow, type ReportStore } from "@/server/privileged/report-store";

type ItemReport = components["schemas"]["ItemReport"];
type ItemReportRequest = components["schemas"]["ItemReportRequest"];
type RetireItemRequest = components["schemas"]["RetireItemRequest"];
type ResolveItemReportRequest = components["schemas"]["ResolveItemReportRequest"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Stores = { reports: ReportStore; serve: ServeStore };
const defaultStores = (): Stores => {
  const sql = privilegedDb();
  return { reports: createReportStore(sql), serve: createServeStore(sql) };
};

const bad = (field: string, message: string) => new ApiError("validation_failed", { errors: [{ field, message }] });

function caller(ctx: ApiContext): string {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  return ctx.caller.userId;
}

function uuidParam(ctx: ApiContext, name: string): string {
  const value = ctx.params[name] ?? "";
  if (!UUID.test(value)) throw new ApiError("not_found");
  return value;
}

async function requireAdmin(stores: Stores, userId: string): Promise<void> {
  if (!(await stores.reports.isAdmin(userId))) throw new ApiError("forbidden");
}

export async function reportItem(ctx: ApiContext, stores: Stores = defaultStores()): Promise<Response> {
  const userId = caller(ctx);
  const itemId = uuidParam(ctx, "item_id");
  const body = ctx.body as ItemReportRequest;
  const admin = await stores.reports.isAdmin(userId);

  // A learner can report what they could be served or have answered; anything else is a 404.
  const item = await stores.serve.findItem(itemId);
  if (!item || !(canServe(item, { userId, admin }, true) || (await stores.reports.hasAttempt(userId, itemId)))) {
    throw new ApiError("not_found");
  }
  if (body.attempt_id && (await stores.reports.attemptItem(userId, body.attempt_id)) !== itemId) throw new ApiError("not_found");

  const eventProps = checkEvent("item_reported", { item_id: itemId, template_key: item.template_key, reason: body.reason, source: "learner" });
  await stores.reports.fileReport({
    userId,
    itemId,
    reason: body.reason,
    note: body.note ?? null,
    attemptId: body.attempt_id ?? null,
    reportedByAdmin: admin,
    eventProps,
  });
  return json({ recorded: true }, 202);
}

export async function retireItem(ctx: ApiContext, stores: Stores = defaultStores()): Promise<Response> {
  const userId = caller(ctx);
  await requireAdmin(stores, userId);
  const itemId = uuidParam(ctx, "item_id");
  const body = ctx.body as RetireItemRequest;
  const reason = body.reason.trim();
  if (reason.length < 5) throw bad("reason", "must have at least 5 characters");
  const result = await stores.reports.retire({ itemId, adminId: userId, reason, retireTemplate: body.retire_template ?? false });
  if (!result) throw new ApiError("not_found");
  return json({
    item_id: itemId,
    status: result.status,
    template_retired: result.templateRetired,
    replaced_tasks: result.replacedTasks,
    pool_items_retired: result.poolItemsRetired,
  });
}

const toReport = (r: ReportRow): ItemReport => ({
  id: r.id,
  item_id: r.item_id,
  target_type: r.target_type as ItemReport["target_type"],
  tutor_message_id: r.tutor_message_id,
  ...(r.template_key ? { template_key: r.template_key } : {}),
  reason: r.reason as ItemReport["reason"],
  note: r.note,
  attempt_id: r.attempt_id,
  status: r.status as ItemReport["status"],
  created_at: r.created_at.toISOString(),
  resolved_at: r.resolved_at ? r.resolved_at.toISOString() : null,
});

const encodeCursor = (r: ReportRow): string => Buffer.from(`${r.created_at.toISOString()}|${r.id}`).toString("base64url");
function decodeCursor(raw: string): { createdAt: Date; id: string } {
  const [at, id] = Buffer.from(raw, "base64url").toString().split("|");
  const createdAt = new Date(at ?? "");
  if (!id || !UUID.test(id) || Number.isNaN(createdAt.getTime())) throw bad("cursor", "is not a valid cursor");
  return { createdAt, id };
}

export async function listItemReports(ctx: ApiContext, stores: Stores = defaultStores()): Promise<Response> {
  await requireAdmin(stores, caller(ctx));
  const q = new URL(ctx.request.url).searchParams;
  const limitRaw = q.get("limit");
  const limit = limitRaw === null ? 25 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw bad("limit", "must be an integer from 1 to 100");
  const status = q.get("status") ?? undefined;
  if (status !== undefined && !["open", "confirmed", "dismissed"].includes(status)) throw bad("status", "is not a report status");
  const itemId = q.get("item_id") ?? undefined;
  if (itemId !== undefined && !UUID.test(itemId)) throw bad("item_id", "must be a uuid");
  const cursor = q.get("cursor");
  const rows = await stores.reports.list({ status, itemId, limit: limit + 1, before: cursor === null ? undefined : decodeCursor(cursor) });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return json({ items: page.map(toReport), next_cursor: rows.length > limit && last ? encodeCursor(last) : null });
}

export async function resolveItemReport(ctx: ApiContext, stores: Stores = defaultStores()): Promise<Response> {
  const userId = caller(ctx);
  await requireAdmin(stores, userId);
  const reportId = uuidParam(ctx, "report_id");
  const body = ctx.body as ResolveItemReportRequest;
  const out = await stores.reports.resolve({ reportId, adminId: userId, status: body.status, retireItem: body.retire_item ?? false });
  if (out === "not_found") throw new ApiError("not_found");
  if (out === "no_item") throw bad("retire_item", "this report has no item to retire");
  return json(toReport(out.report));
}
