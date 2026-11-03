// One zod schema per event of the catalogue (doc 11 section 9, FR-110), built from the generated
// key lists. The doc names the keys, not their types, so values are JSON and every key is optional;
// unknown keys are refused, which also keeps free-text learner input out of `props`.
import { EVENT_COMMON_KEYS, EVENT_PROP_KEYS, type EventName } from "@polymath/shared-types";
import { z } from "zod";

/** events.props is checked `pg_column_size(props) < 8192`; the JSON text stays under this. */
export const MAX_PROPS_BYTES = 8000;

const isoTime = z.iso.datetime({ offset: true });

const schemas = new Map<string, z.ZodType<Record<string, unknown>>>();

export function isEventName(name: string): name is EventName {
  return Object.hasOwn(EVENT_PROP_KEYS, name);
}

/** The props schema of a catalogued event. Throws for a name that is not in the catalogue. */
export function propsSchema(name: string): z.ZodType<Record<string, unknown>> {
  if (!isEventName(name)) throw new Error(`unknown event name "${name}"`);
  let schema = schemas.get(name);
  if (!schema) {
    const shape: Record<string, z.ZodType> = {};
    for (const key of EVENT_PROP_KEYS[name]) shape[key] = z.json().optional();
    for (const key of EVENT_COMMON_KEYS) shape[key] = isoTime.optional();
    schema = z
      .strictObject(shape)
      .refine((p) => new TextEncoder().encode(JSON.stringify(p)).byteLength <= MAX_PROPS_BYTES, "props are too large");
    schemas.set(name, schema);
  }
  return schema;
}
