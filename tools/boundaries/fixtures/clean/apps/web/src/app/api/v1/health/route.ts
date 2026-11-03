// Allowed: a thin handler well under 60 lines.
export function GET(): Response {
  return Response.json({ ok: true });
}
