import { AppShell } from "@/components/shell/app-shell";
import { LessonReader } from "./lesson-reader";

export const dynamic = "force-dynamic";

// Re-reading a concept primer from the skill map (00a M3). Signed-out visitors are sent to /welcome by the proxy.
export default async function LessonPage({ params }: { params: Promise<{ skill_key: string }> }) {
  const { skill_key: skillKey } = await params;
  return (
    <AppShell current="map">
      <LessonReader skillKey={decodeURIComponent(skillKey)} />
    </AppShell>
  );
}
