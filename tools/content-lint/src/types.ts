export type Severity = "E" | "W";

export type Finding = { file: string; rule: string; severity: Severity; message: string };

/** A loaded template: its path relative to the content root and the parsed (G0-valid) document. */
export type TemplateInput = { file: string; doc: Record<string, unknown>; sha256?: string | undefined };

/** What the database already holds for a template key (the newest version), for L03. */
export type SyncedTemplate = { version: number; sha256: string | null; status: string };

export type LintOptions = {
  /** Directory that holds `prompts/` (the content root). */
  contentRoot: string;
  /** Keys in the skill graph; L02 checks `skill_key` only when this is given. */
  skillKeys?: ReadonlySet<string> | undefined;
  /** Synced templates by key; L03 runs only when this is given. */
  synced?: ReadonlyMap<string, SyncedTemplate> | undefined;
};

export type RuleHit = { message: string };
