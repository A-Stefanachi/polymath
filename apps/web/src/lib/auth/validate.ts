// Input checks for the sign-in routes (trust boundary; doc 03 section 11).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** Strips the spaces and dashes people paste along with a code; exactly six digits remain or null. */
export function parseCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

/** Signup toggle (ST-AUTH-01): new accounts only when AUTH_SIGNUP_ENABLED is exactly "true". */
export function signupEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AUTH_SIGNUP_ENABLED === "true";
}

/** Runs `work`, then waits until `floorMs` has passed since the start, whatever `work` did. */
export async function withMinimumDuration<T>(floorMs: number, work: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await work();
  } finally {
    const wait = floorMs - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  }
}
