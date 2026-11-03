// Structured JSON logger with redaction (BL-0005; doc 03 section 10.2; CLAUDE.md rule 2.5).
// One line per call: { ts, level, msg, ...base, ...fields }. Fields whose key names a secret or
// learner content are replaced by "[REDACTED]" at any depth, and string values that look like a
// credential (a bearer token, a JWT, a Supabase secret key, an API key) are replaced wherever they
// appear, so a secret under an innocent key name is still not written.

export const REDACTED = "[REDACTED]";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;
export type LogSink = (line: string) => void;

export type Logger = {
  [L in LogLevel]: (msgOrFields: string | LogFields, fields?: LogFields) => void;
} & { child: (base: LogFields) => Logger };

export type LoggerOptions = {
  /** Where each JSON line goes. Default: stdout through console.log. */
  sink?: LogSink;
  /** Fields on every line (env, git_sha, request_id...). */
  base?: LogFields;
  /** Clock in ms since the epoch; tests inject a fixed one. */
  now?: () => number;
};

// Key names are compared after lowercasing and dropping everything but letters and digits, so
// `Authorization`, `x-api-key`, `SUPABASE_SECRET_KEY` and `vapidPrivateKey` all match.
const DENY_SUBSTRINGS = [
  "authorization",
  "cookie",
  "apikey",
  "secret", // secret key, hmac secret, client secret
  "servicerole",
  "hmac",
  "vapidprivate",
  "privatekey",
  "password",
  "passwd",
  "signedurl",
  "magiclink",
  "signincode",
  "jwt",
];
// Keys that must match whole: as substrings they would hide counters such as `tokens_in` (token
// and cost logging is required, CLAUDE.md section 11) or harmless names such as `content_type`.
const DENY_EXACT = new Set(["response", "content", "text", "body", "prompt", "freetext"]);
const DENY_SUFFIXES = ["token"]; // access_token, refresh_token, x-auth-token

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g, // JWT
  /\bsb_secret_[A-Za-z0-9_-]+/g,
  /\bsk-(?:ant-|or-)?[A-Za-z0-9_-]{16,}/g, // Anthropic, OpenRouter and OpenAI-style keys
];

const MAX_DEPTH = 8;

function normalise(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isDeniedKey(key: string): boolean {
  const k = normalise(key);
  return (
    DENY_EXACT.has(k) ||
    DENY_SUBSTRINGS.some((s) => k.includes(s)) ||
    DENY_SUFFIXES.some((s) => k.endsWith(s))
  );
}

export function redactString(value: string): string {
  return SECRET_VALUE_PATTERNS.reduce((acc, re) => acc.replace(re, REDACTED), value);
}

export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  if (depth >= MAX_DEPTH) return "[Truncated]";
  seen.add(value);
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = isDeniedKey(k) ? REDACTED : redact(v, depth + 1, seen);
  }
  return out;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const sink = options.sink ?? ((line: string) => console.log(line));
  const now = options.now ?? Date.now;
  const base = options.base ?? {};

  const write = (level: LogLevel, msgOrFields: string | LogFields, fields?: LogFields): void => {
    const msg = typeof msgOrFields === "string" ? msgOrFields : "";
    const extra = typeof msgOrFields === "string" ? (fields ?? {}) : msgOrFields;
    const record = redact({ ...base, ...extra }) as LogFields;
    const line: LogFields = { ts: new Date(now()).toISOString(), level, msg: redactString(msg) };
    // Fields never overwrite ts, level or msg.
    for (const [k, v] of Object.entries(record)) if (!(k in line)) line[k] = v;
    sink(JSON.stringify(line));
  };

  return {
    debug: (m, f) => write("debug", m, f),
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
    child: (more) => createLogger({ ...options, base: { ...base, ...more } }),
  };
}

export const logger = createLogger();
