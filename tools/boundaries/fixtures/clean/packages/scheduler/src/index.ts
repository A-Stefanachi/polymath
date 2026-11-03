// Allowed: time comes in as an argument; shared-types is an allowed dependency.
import { TYPES } from "../../shared-types/src/index";

export function dueAt(now: number, intervalS: number): Date {
  return new Date(now + intervalS * 1000 + TYPES.length);
}
