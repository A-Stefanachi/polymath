// Catch-all for /api/v1 paths that have no route file yet (ST-AUTH-04). Without it a path the
// OpenAPI file lists but no handler serves would answer 404 to an anonymous caller, hiding a
// missing guard until the handler lands. Here a caller without a session always gets 401, and a
// signed-in caller gets 404 `not_found`.
import { authenticate, type Authenticate } from "./auth.ts";
import { ApiError, problemResponse } from "./errors.ts";

export function unmatchedRoute(auth: Authenticate = authenticate) {
  return async (request: Request): Promise<Response> => {
    const requestId = `req_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
    try {
      await auth(request);
      return problemResponse(new ApiError("not_found"), requestId);
    } catch (error) {
      return problemResponse(error instanceof ApiError ? error : new ApiError("unauthenticated"), requestId);
    }
  };
}
