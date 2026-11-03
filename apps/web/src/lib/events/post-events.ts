// postEvents (api.openapi.yaml; doc 11 section 9): a batch of client events. Each name must be in
// the catalogue and each props object must match its schema; the whole batch is refused when any
// event is invalid, so a client never half-stores a batch. The client's time is kept as
// props.client_at, `at` is the server's now() (FR-110).
import type { components } from "@polymath/shared-types";
import { ApiError, type FieldError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { privilegedDb } from "@/server/privileged/db";
import { createEventStore, type EventRow, type EventStore } from "@/server/privileged/events-store";
import { checkEvent } from "./emit.ts";

/**
 * Events only the server may write. A client could otherwise forge a consent or a safety
 * acknowledgement (review REVIEW-2026-11-02 finding on safety_ack).
 */
export const SERVER_ONLY_EVENTS: ReadonlySet<string> = new Set(["consent_recorded", "safety_ack"]);

type ClientEvent = components["schemas"]["ClientEvent"];

export async function acceptEvents(ctx: ApiContext, store: EventStore = createEventStore(privilegedDb())): Promise<Response> {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  const { events } = ctx.body as { events: ClientEvent[] };
  const errors: FieldError[] = [];
  const rows: EventRow[] = [];
  events.forEach((event, i) => {
    if (SERVER_ONLY_EVENTS.has(event.name)) {
      errors.push({ field: `events.${String(i)}.name`, message: "this event is recorded by the server only" });
      return;
    }
    try {
      const props = checkEvent(event.name, event.props ?? {}, event.at);
      rows.push({ userId: ctx.caller?.userId ?? "", name: event.name, props, clientEventId: event.client_event_id });
    } catch (error) {
      errors.push({ field: `events.${String(i)}`, message: error instanceof Error ? error.message : "invalid event" });
    }
  });
  if (errors.length > 0) throw new ApiError("validation_failed", { errors: errors.slice(0, 20) });
  await store.insert(rows);
  return json({ accepted: rows.length }, 202);
}
