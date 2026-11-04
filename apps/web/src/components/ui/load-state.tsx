import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lists } from "@/copy/strings";

/** Loading skeleton: shapes plus a status word for screen readers (doc 09 section 3.2). */
export function LoadingBlock({ label = lists.loading }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3" data-testid="loading">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-16 border-[3px] border-dashed border-muted" />
      ))}
    </div>
  );
}

/** Error state: what happened, that nothing is lost, and a retry. */
export function ErrorBlock({ offline, onRetry }: { offline: boolean; onRetry: () => void }) {
  return (
    <Card role="alert">
      <p className="font-bold">{lists.errorTitle}</p>
      <p>{offline ? lists.offlineBody : lists.errorBody}</p>
      <div>
        <Button type="button" variant="secondary" size="md" onClick={onRetry}>
          {lists.retry}
        </Button>
      </div>
    </Card>
  );
}

export function EmptyBlock({ children }: { children: ReactNode }) {
  return <Card>{children}</Card>;
}
