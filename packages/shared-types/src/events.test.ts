// BL-0024: the generated event union matches the catalogue of doc 11 section 9. This test parses
// the document table on its own (not with the generator), so a rename in the doc that the
// committed file does not follow fails here (risk note of BL-0024: catalogue drift).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVENT_NAMES, EVENT_PROP_KEYS } from "./events.gen.ts";

const DOC = new URL("../../../polymath-app-spec/docs/11-evaluation-and-experiment-plan.md", import.meta.url);

function catalogue(): Map<string, string[]> {
  const text = readFileSync(DOC, "utf8");
  const section = text.slice(text.indexOf("## 9. Event catalogue"), text.indexOf("## 10. Dashboards"));
  const found = new Map<string, string[]>();
  for (const row of section.split("\n").filter((l) => l.startsWith("| `"))) {
    const [, names = "", props = ""] = row.split("|");
    const keys = [...props.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? "");
    for (const m of names.matchAll(/`([^`]+)`/g)) found.set(m[1] ?? "", keys);
  }
  return found;
}

describe("event catalogue (doc 11 section 9, 00a D6)", () => {
  const doc = catalogue();

  it("parses a plausible catalogue from the document", () => {
    expect(doc.size).toBeGreaterThan(60);
    expect(doc.get("consent_recorded")).toEqual(["consent_version", "research"]);
    expect(doc.get("data_export_requested")).toEqual([]);
  });

  it("the generated union lists exactly the names of the document", () => {
    expect([...EVENT_NAMES].sort()).toEqual([...doc.keys()].sort());
  });

  it("each event keeps the prop keys the document gives it", () => {
    for (const [name, keys] of doc) expect([...EVENT_PROP_KEYS[name as keyof typeof EVENT_PROP_KEYS]], name).toEqual(keys);
  });
});
