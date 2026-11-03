// emitEvent (BL-0024): the one server helper that writes an event. The name must be in the
// catalogue and the props must match its schema, otherwise it throws before anything is written.
// `at` is the database's now(); a client clock only ever travels as props.client_at.
import type { EventName } from "@polymath/shared-types";
import { privilegedDb } from "@/server/privileged/db";
import { createEventStore, type EventStore } from "@/server/privileged/events-store";
import { isEventName, propsSchema } from "./schemas.ts";

export type EmitContext = {
  userId: string;
  /** Defaults to the privileged database. */
  store?: EventStore;
  /** Dedupe key of a client-originated event. */
  clientEventId?: string;
  /** The client's own clock; stored in props.client_at, never as `at`. */
  clientAt?: string;
};

export type EventProps = Record<string, unknown>;

/** Validates one event (name and props) and returns the props to store. */
export function checkEvent(name: string, props: EventProps, clientAt?: string): EventProps {
  if (!isEventName(name)) throw new Error(`unknown event name "${name}"`);
  const merged = clientAt === undefined ? props : { ...props, client_at: clientAt };
  const parsed = propsSchema(name).safeParse(merged);
  if (!parsed.success) {
    // Field paths only: values may be learner data.
    const where = parsed.error.issues.map((i) => (i.code === "unrecognized_keys" ? i.keys.join(", ") : i.path.join(".") || "(props)"));
    throw new Error(`invalid props for event "${name}": ${where.join(", ")}`.slice(0, 300));
  }
  return parsed.data;
}

export async function emitEvent(name: EventName | (string & {}), props: EventProps, ctx: EmitContext): Promise<void> {
  const checked = checkEvent(name, props, ctx.clientAt);
  const store = ctx.store ?? createEventStore(privilegedDb());
  await store.insert([{ userId: ctx.userId, name, props: checked, clientEventId: ctx.clientEventId }]);
}
