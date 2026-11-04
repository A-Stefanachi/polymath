/**
 * Absolute URL on the origin the browser used. `request.url` can carry an internal host name
 * (localhost, a container address); a session cookie set for one host is not sent to another, so a
 * redirect must go back to the host that was asked. Only the path is ever chosen by the app.
 */
export function appUrl(request: Request, path: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  try {
    return new URL(path, `${proto}://${host}`);
  } catch {
    return new URL(path, request.url);
  }
}
