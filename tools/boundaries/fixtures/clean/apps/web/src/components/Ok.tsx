// Allowed: UI code importing a shared helper and a workspace package.
import { cn } from "../lib/utils";

export function Ok() {
  return <p className={cn("ok")}>ok</p>;
}
