import { AppShell } from "@/components/shell/app-shell";
import { ReviewScreen } from "./review-screen";

export const dynamic = "force-dynamic";

// S17 Review queue (doc 09): what is due, with control over it. Signed-out visitors are sent to /welcome by the proxy.
export default function ReviewPage() {
  return (
    <AppShell current="review">
      <ReviewScreen />
    </AppShell>
  );
}
