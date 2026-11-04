import { unmatchedRoute } from "@/lib/api/unmatched";

export const dynamic = "force-dynamic";

// Paths without a route file yet: 401 without a session, 404 with one (ST-AUTH-04).
const handler = unmatchedRoute();
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
