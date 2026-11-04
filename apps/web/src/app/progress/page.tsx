import { AppShell } from "@/components/shell/app-shell";
import { ProgressScreen } from "./progress-screen";

export const dynamic = "force-dynamic";

// S15 Progress and tier view (doc 09): evidence of what has been shown, never a score. Signed-out visitors are sent
// to /welcome by the proxy.
export default function ProgressPage() {
  return (
    <AppShell current="progress">
      <ProgressScreen />
    </AppShell>
  );
}
