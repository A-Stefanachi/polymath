import { defineRoute } from "@/lib/api/route";
import { getGraph } from "@/lib/graph/graph";

export const dynamic = "force-dynamic";

// getGraph: nodes and edges with the caller's state overlay; stubs only with include_stubs=true.
export const GET = defineRoute("getGraph", (ctx) => getGraph(ctx));
