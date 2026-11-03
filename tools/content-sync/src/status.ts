// The status rule of doc 07 section 10 step 5, with the REVIEW-LOG condition of 00a H4.
export type TemplateStatus = "draft" | "needs_human_review" | "verified" | "retired";

/** True when REVIEW-LOG.md has a row for `key` with hand-solve "done" and 0 disagreements. */
export function reviewLogDone(log: string, key: string): boolean {
  for (const line of log.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    // | Template key | v | G3 seeds | Hand-solve | Disagreements |
    if (cells[0] === key && /^done\b/i.test(cells[3] ?? "") && cells[4] === "0") return true;
  }
  return false;
}

export type StatusInput = {
  authoringStatus: string;
  key: string;
  sha256: string;
  review: Record<string, unknown>;
  reviewLog: string;
  /** The G2 fuzz job recorded for this exact hash passed. */
  fuzzPassed: boolean;
};

/** Files declare draft, ready or retired; only a ready template can become verified (rule 3). */
export function statusFor(input: StatusInput): TemplateStatus {
  if (input.authoringStatus === "draft") return "draft";
  if (input.authoringStatus === "retired") return "retired";
  const reviewed = input.review["template_sha256"] === input.sha256 && reviewLogDone(input.reviewLog, input.key);
  return input.fuzzPassed && reviewed ? "verified" : "needs_human_review";
}
