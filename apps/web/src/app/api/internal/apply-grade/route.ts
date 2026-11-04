import { applyGradeCallback } from "@/lib/internal/apply-grade";

export const dynamic = "force-dynamic";

// Worker callback after a queued grade is stored (BL-0196). HMAC-signed, no session.
export const POST = (request: Request): Promise<Response> => applyGradeCallback(request);
