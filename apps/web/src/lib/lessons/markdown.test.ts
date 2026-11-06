// Concept primer Markdown (00a K6). The units-and-prefixes lesson (verified) holds a pipe table; the renderer
// showed it as one paragraph of raw "| Prefix | Symbol |" text on the phone (founder, 6 Nov 2026).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LessonMarkdown } from "./markdown.tsx";

const html = (source: string) => renderToStaticMarkup(createElement(LessonMarkdown, { source }));

const TABLE = ["A prefix is a multiplier:", "", "| Prefix | Symbol | Factor |", "|---|---|---|", "| kilo | k | $10^{3}$ |", "| milli | m | $10^{-3}$ |", "", "Case matters."].join("\n");

describe("LessonMarkdown tables", () => {
  it("renders a pipe table as a table with column headers, one row per line, and no raw pipes", () => {
    const out = html(TABLE);
    expect(out).toContain("<table");
    expect(out.match(/<th scope="col"[^>]*>/g)).toHaveLength(3);
    expect(out).toContain(">Prefix</th>");
    expect(out.match(/<tr[ >]/g)).toHaveLength(3); // header row and two body rows
    expect(out).toContain("<td>kilo</td>");
    expect(out).not.toContain("|");
  });

  it("renders inline math inside a cell and keeps the paragraphs around the table", () => {
    const out = html(TABLE);
    expect(out).toMatch(/<td><span[^>]*><span class="katex">/);
    expect(out).toContain("<p>A prefix is a multiplier:</p>");
    expect(out).toContain("<p>Case matters.</p>");
  });

  it("leaves a paragraph that merely contains a pipe as a paragraph", () => {
    expect(html("Use |x| for the absolute value.")).toBe('<div class="flex flex-col gap-3 text-[17px]"><p>Use |x| for the absolute value.</p></div>');
  });
});
