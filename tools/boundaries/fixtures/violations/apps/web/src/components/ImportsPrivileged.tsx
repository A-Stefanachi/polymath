// Violation: ui-no-privileged (a component importing the privileged module through the alias).
import { privilegedQuery } from "@/server/privileged/db";

export function ImportsPrivileged() {
  return <p>{privilegedQuery("select 1")}</p>;
}
