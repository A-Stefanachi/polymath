import { AppShell } from "@/components/shell/app-shell";
import { MapScreen } from "./map-screen";

export const dynamic = "force-dynamic";

// S14 Skill map (doc 09): where the learner is in the graph and what is next. Signed-out visitors are sent to
// /welcome by the proxy.
export default function MapPage() {
  return (
    <AppShell current="map">
      <MapScreen />
    </AppShell>
  );
}
