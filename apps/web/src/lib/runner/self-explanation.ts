// Packs the stepper's picks and the optional sentence into CompleteTaskRequest.self_explanation (a string of
// 1 to 2000 characters, stored and never graded: FR-032, LS-008, 00a K4). Returns undefined when there is nothing to send.
export const SELF_EXPLANATION_MAX = 2000;

export type StepPick = { id: string; picked: string; right: boolean };

export function packSelfExplanation(picks: readonly StepPick[], text: string): string | undefined {
  const lines = picks.map((p) => `${p.id}: ${p.picked} (${p.right ? "matched" : "other"})`);
  const note = text.trim();
  if (note !== "") lines.push(`Note: ${note}`);
  const packed = lines.join("\n").slice(0, SELF_EXPLANATION_MAX);
  return packed === "" ? undefined : packed;
}

/** Fisher-Yates over a copy; `random` is injectable for tests. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
