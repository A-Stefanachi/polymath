// ST-AUTH-04, generated from api.openapi.yaml: every operation called without a token answers 401,
// except the ones that declare `security: []` (getHealth). The routing of Next.js is reproduced
// from the file tree: a route file whose directory matches the path serves it, anything else
// falls to the catch-all at app/api/v1/[...path]. A path whose route file lacks the method would
// answer 405 in Next, so it fails here until that method guards itself.
import { beforeAll, describe, expect, it } from "vitest";
import { OPERATIONS } from "./openapi.gen.ts";

type Handler = (request: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
type RouteModule = Partial<Record<string, Handler>>;

const modules = import.meta.glob<RouteModule>("../../app/api/v1/**/route.ts");
const PREFIX = "../../app/api/v1/";

function routeDir(file: string): string {
  return file.slice(PREFIX.length, -"/route.ts".length);
}

async function handlerFor(path: string, method: string): Promise<Handler | undefined> {
  const dir = path.slice(1).replace(/\{(\w+)\}/g, "[$1]");
  const file = Object.keys(modules).find((f) => routeDir(f) === dir) ?? Object.keys(modules).find((f) => routeDir(f) === "[...path]");
  const load = file ? modules[file] : undefined;
  return (await load?.())?.[method];
}

beforeAll(() => {
  // Only the shape matters: with no cookie and no bearer token the client never leaves the process.
  process.env["NEXT_PUBLIC_SUPABASE_URL"] = "http://127.0.0.1:1";
  process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_test";
});

const secured = Object.entries(OPERATIONS).filter(([, op]) => !op.public);

describe("ST-AUTH-04: no token, no access", () => {
  it("covers every operation of the OpenAPI file", () => {
    expect(secured.length).toBeGreaterThan(60);
    expect(Object.entries(OPERATIONS).filter(([, op]) => op.public).map(([id]) => id)).toEqual(["getHealth"]);
  });

  it.each(secured)("%s answers 401 without a token", async (_id, op) => {
    const handler = await handlerFor(op.path, op.method);
    expect(handler, `${op.method} ${op.path} has no handler and no catch-all`).toBeDefined();
    const params = Object.fromEntries([...op.path.matchAll(/\{(\w+)\}/g)].map((m) => [m[1] ?? "", "x"]));
    const url = `http://localhost/api/v1${op.path.replace(/\{\w+\}/g, "x")}`;
    const init: RequestInit = op.method === "GET" || op.method === "DELETE" ? {} : { body: "{}", headers: { "content-type": "application/json" } };
    const res = await handler?.(new Request(url, { method: op.method, ...init }), { params: Promise.resolve(params) });
    expect(res?.status).toBe(401);
    expect(((await res?.json()) as { code: string }).code).toBe("unauthenticated");
  });

  it("a bearer token that is not a valid session is refused too", async () => {
    const handler = await handlerFor("/profile", "GET");
    const res = await handler?.(new Request("http://localhost/api/v1/profile", { headers: { authorization: "Bearer not-a-jwt" } }), {
      params: Promise.resolve({}),
    });
    expect(res?.status).toBe(401);
  });
});
