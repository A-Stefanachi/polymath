// Forbidden-claim rules (BL-0006; contract section 8, PRD 11.2, CLAUDE.md rule 2.2).
//
// `reference` patterns are copied verbatim, in order, from CATEGORIES in
// polymath-app-spec/reference/lint_claims.py (the oracle; BL-0194 checks parity on the corpus).
// `extended` patterns cover what the reference set does not: the ten forbidden UI strings of
// PRD 11.2 and the contract's "no medical or health claims". Within a category the reference
// patterns are tried first, as in the script, so a line both sets match reports the same hit.
import { pyRegExp } from "./pyre.ts";

export type PatternSource = "reference" | "extended";
export type Rule = { re: RegExp; source: PatternSource };
export type Category = { id: string; rules: Rule[] };

// Case-sensitive in the reference script (CASE_SENSITIVE): acronyms that are ordinary words in
// lower case.
const CASE_SENSITIVE = new Set([
  String.raw`\bTMR\b`,
  String.raw`\btDCS\b`,
  String.raw`\btaVNS\b`,
  String.raw`\bTMS\b`,
  String.raw`\bHRV\b`,
  String.raw`\bEEG\b`,
]);

const ref = (p: string): Rule => ({ re: pyRegExp(p, !CASE_SENSITIVE.has(p)), source: "reference" });
const ext = (p: string): Rule => ({ re: pyRegExp(p, true), source: "extended" });

export const CATEGORIES: Category[] = [
  {
    id: "neuroplasticity-window",
    rules: [
      ref(String.raw`neuro-?plasticity`),
      ref(String.raw`critical[- ]period`),
      ref(String.raw`surge window`),
      ref(String.raw`plasticity window`),
      ref(String.raw`window of plasticity`),
      // PRD 11.2 #1 "Unlock your brain's peak learning window."
      ext(String.raw`\b(?:peak|prime|golden|optimal) (?:learning )?window\b`),
    ],
  },
  {
    id: "targeted-memory-replay",
    rules: [
      ref(String.raw`targeted memory (?:reactivation|replay)`),
      ref(String.raw`\bTMR\b`),
      ref(String.raw`sleep[- ]cueing`),
      ref(String.raw`closed[- ]loop sleep`),
      ref(String.raw`memory replay`),
    ],
  },
  {
    id: "neurostimulation",
    rules: [
      ref(String.raw`neuro-?stimulation`),
      ref(String.raw`\btDCS\b`),
      ref(String.raw`\btaVNS\b`),
      ref(String.raw`\bTMS\b`),
      ref(String.raw`transcranial`),
      ref(String.raw`neuro-?modulation`),
      ref(String.raw`photobiomodulation`),
    ],
  },
  {
    id: "two-sigma",
    rules: [ref(String.raw`\b2[- ]sigma\b`), ref(String.raw`\btwo[- ]sigma\b`), ref(String.raw`\b2\s?σ\b`)],
  },
  {
    id: "85-percent-rule",
    rules: [
      ref(String.raw`85\s?%\s?rule`),
      ref(String.raw`85 percent rule`),
      ref(String.raw`eighty-five percent rule`),
      // PRD 11.2 #7 "Keep your success rate at the proven 85% for optimal learning."
      ext(String.raw`\b(?:proven|optimal|magic|ideal)\s+85\s?(?:%|percent)`),
      ext(String.raw`85\s?(?:%|percent)\b[^.\n]{0,40}\b(?:optimal|proven) (?:for )?learning`),
    ],
  },
  {
    id: "90-minute-cycle",
    rules: [
      ref(String.raw`90[- ]minute (?:brain )?(?:cycle|rhythm)`),
      ref(String.raw`ultradian`),
      ref(String.raw`90[- ]min(?:ute)? cycle`),
    ],
  },
  {
    id: "top-1-percent",
    rules: [
      ref(String.raw`top 1\s?%`),
      ref(String.raw`top one percent`),
      ref(String.raw`top 1 percent`),
      ref(String.raw`top-1%`),
    ],
  },
  {
    id: "mastery-of-all",
    rules: [
      ref(String.raw`mastery of all`),
      ref(String.raw`master(?:ing)? all (?:the )?disciplines`),
      ref(String.raw`mastery of every`),
    ],
  },
  {
    id: "novices-beat-experts",
    rules: [
      ref(String.raw`novices? (?:beat|outperform\w*|surpass\w*) experts?`),
      ref(String.raw`16[- ]weeks?[^.\n]{0,60}\bexperts?\b`),
      ref(String.raw`\bexperts?\b[^.\n]{0,60}16[- ]weeks?`),
    ],
  },
  {
    id: "emotion-biometric-inference",
    rules: [
      ref(String.raw`emotion (?:inference|recognition|detection|sensing)`),
      ref(String.raw`infer\w* (?:the )?(?:learner'?s? )?emotion`),
      ref(String.raw`\bbiometric`),
      ref(String.raw`heart[- ]rate variability`),
      ref(String.raw`\bHRV\b`),
      ref(String.raw`\bEEG\b`),
      ref(String.raw`webcam gaze`),
      ref(String.raw`neural data`),
      ref(String.raw`brain[- ]computer`),
      ref(String.raw`facial expression`),
    ],
  },
  // Categories below are not in the reference script (PRD 11.2, contract section 8).
  {
    // PRD 11.2 #2 "Learn twice as fast with our AI tutor." (no efficacy claims)
    id: "efficacy-multiplier",
    // Only about learning: "an inner loop 10 times faster" (control theory) and "stability grows
    // 0.7x as fast" (a scheduler simulation) are not claims.
    rules: [
      ext(String.raw`\b(?:learn|study|master|progress|remember)\w*\b[^.\n]{0,30}\b(?:twice|three times|four times|ten times|\d+(?:\.\d+)?\s?(?:x|×|times))\s+(?:as\s+)?(?:fast|faster|quicker|quickly|more|better)\b`),
      ext(String.raw`\b(?:twice|three times|ten times|\d+(?:\.\d+)?\s?(?:x|×|times))\s+(?:as\s+)?(?:fast|faster|quicker)\s+(?:learn|study|master|progress|recall)\w*`),
    ],
  },
  {
    // PRD 11.2 #5 "Built on secret military learning techniques."
    id: "secret-techniques",
    rules: [
      ext(String.raw`\bsecret\s+(?:military\s+)?(?:learning\s+)?(?:techniques?|methods?|formula)\b`),
      ext(String.raw`\bmilitary[- ](?:grade|secret)\s+(?:learning|training|techniques?)\b`),
    ],
  },
  {
    // PRD 11.2 #6 "Every session rewires your brain."
    id: "brain-rewiring",
    rules: [
      ext(String.raw`\brewir\w*\s+(?:your\s+|the\s+)?brain`),
      ext(String.raw`\bbrain[- ]?(?:rewiring|hack\w*|boost\w*)`),
    ],
  },
  {
    // PRD 11.2 #9 "Learn while you sleep" / "Focus audio that boosts learning." (02 section 6)
    id: "sleep-or-audio-learning",
    rules: [
      ext(String.raw`\blearn\w*\s+(?:while|as)\s+you\s+sleep\b`),
      ext(String.raw`\bsleep[- ]learning\b`),
      ext(String.raw`\bbinaural\b`),
      ext(String.raw`\bfocus (?:audio|music|sounds?)\b[^.\n]{0,40}\b(?:boost|improv|enhanc)\w*`),
    ],
  },
  {
    // PRD 11.2 #10 "Our AI knows exactly what you have forgotten and guarantees retention."
    id: "guaranteed-outcome",
    rules: [
      ext(String.raw`\bguarantee\w*\b[^.\n;]{0,40}\b(?:retention|recall|results|learning|mastery|success)\b`),
      ext(String.raw`\bknows? exactly what you(?:'ve| have)? forgotten\b`),
    ],
  },
  {
    // Contract section 8: no medical or health claims.
    id: "medical-claim",
    rules: [
      ext(String.raw`\b(?:cures?|treats?|treatment for|prevents?|diagnos\w*|heals?)\b[^.\n]{0,40}\b(?:ADHD|dementia|alzheimer'?s?|anxiety|depression|dyslexia|disease|disorder|cognitive decline)\b`),
      ext(String.raw`\bclinically (?:proven|tested|validated)\b`),
      ext(String.raw`\bdoctor[- ](?:recommended|approved)\b`),
      ext(String.raw`\b(?:boosts?|improves?|increases?)\s+(?:your\s+)?(?:IQ|brain health|mental health|memory capacity)\b`),
    ],
  },
];

export type Hit = { category: string; fragment: string; source: PatternSource };

/** Like hits_in_line in the reference: per category, the first pattern that matches. */
export function hitsInLine(line: string): Hit[] {
  const out: Hit[] = [];
  for (const cat of CATEGORIES) {
    for (const rule of cat.rules) {
      const m = rule.re.exec(line);
      if (m) {
        out.push({ category: cat.id, fragment: m[0], source: rule.source });
        break;
      }
    }
  }
  return out;
}
