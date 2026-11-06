import katex from "katex";
import type { ReactNode } from "react";

// The small Markdown subset that concept primers use (schemas/lesson.schema.json, doc 07 section 15):
// paragraphs, numbered and bulleted lists, pipe tables (`| a | b |` with a `|---|---|` rule; the
// units-and-prefixes primer has one), **bold**, *italic*, inline math $...$ and display math $$...$$.
// Everything is built as React elements, so text is escaped; the only raw HTML is KaTeX output with trust off
// (no \href, no raw HTML). Server-renderable.

const INLINE = /(\$\$[\s\S]+?\$\$|\$[^$]+\$|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/;

function math(source: string, display: boolean, key: number): ReactNode {
  const html = katex.renderToString(source, { throwOnError: false, trust: false, displayMode: display });
  return <span key={key} className={display ? "block overflow-x-auto" : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Inline spans of one paragraph or list item. */
export function Inline({ source }: { source: string }): ReactNode {
  return source.split(INLINE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith("$$")) return math(part.slice(2, -2), true, i);
    if (part.startsWith("$")) return math(part.slice(1, -1), false, i);
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <em key={i}>{part.slice(1, -1)}</em>;
  });
}

type Block = { kind: "p" | "math" | "ol" | "ul"; lines: string[]; start?: number } | { kind: "table"; head: string[]; rows: string[][] };

const ORDERED = /^\s*(\d+)\.\s+(.*)$/s;
const BULLET = /^\s*[-*]\s+(.*)$/s;
const TABLE_RULE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;

/** The cells of one `| a | b |` line; pipes inside $...$ math stay in their cell. */
function cells(line: string): string[] {
  const out: string[] = [];
  let cell = "";
  let inMath = false;
  for (const ch of line.trim().replace(/^\|/, "").replace(/\|$/, "")) {
    if (ch === "$") inMath = !inMath;
    if (ch === "|" && !inMath) {
      out.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  out.push(cell.trim());
  return out;
}

/** A pipe table: every line starts with `|`, the second line is the `|---|---|` rule. Null for anything else. */
function tableOf(raw: string): Block | null {
  const lines = raw.trim().split("\n").map((l) => l.trim());
  const [header, rule, ...body] = lines;
  if (header === undefined || rule === undefined || !lines.every((l) => l.startsWith("|")) || !TABLE_RULE.test(rule)) return null;
  return { kind: "table", head: cells(header), rows: body.map(cells) };
}

function blocksOf(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.trim().split(/\n\s*\n/)) {
    const table = tableOf(raw);
    if (table) {
      blocks.push(table);
      continue;
    }
    const text = raw.trim().replace(/\s*\n\s*/g, " ");
    if (text === "") continue;
    const ordered = ORDERED.exec(text);
    const bullet = BULLET.exec(text);
    const last = blocks.at(-1);
    if (/^\$\$[\s\S]+\$\$$/.test(text) && !text.slice(2, -2).includes("$$")) blocks.push({ kind: "math", lines: [text.slice(2, -2)] });
    else if (ordered) {
      // Items separated by blank lines still form one list.
      if (last?.kind === "ol") last.lines.push(ordered[2] ?? "");
      else blocks.push({ kind: "ol", lines: [ordered[2] ?? ""], start: Number(ordered[1]) });
    } else if (bullet) {
      if (last?.kind === "ul") last.lines.push(bullet[1] ?? "");
      else blocks.push({ kind: "ul", lines: [bullet[1] ?? ""] });
    } else blocks.push({ kind: "p", lines: [text] });
  }
  return blocks;
}

export function LessonMarkdown({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-3 text-[17px]">
      {blocksOf(source).map((b, i) => {
        if (b.kind === "table") {
          // Scrolls sideways inside its own box at 360 px rather than widening the page; headers are real <th>.
          return (
            <div key={i} className="overflow-x-auto">
              <table className="border-collapse text-left [&_td]:px-3 [&_td]:py-1">
                <thead>
                  <tr>
                    {b.head.map((h, j) => (
                      <th key={j} scope="col" className="border-b-2 border-ink px-3 py-1 font-semibold">
                        <Inline source={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j} className="border-b border-muted">
                      {r.map((c, k) => (
                        <td key={k}>
                          <Inline source={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.kind === "math") return <div key={i}>{math(b.lines[0] ?? "", true, i)}</div>;
        if (b.kind === "ol" || b.kind === "ul") {
          const List = b.kind;
          return (
            <List key={i} className={`flex flex-col gap-1 pl-6 ${b.kind === "ol" ? "list-decimal" : "list-disc"}`} {...(b.kind === "ol" && b.start && b.start > 1 ? { start: b.start } : {})}>
              {b.lines.map((l, j) => (
                <li key={j}>
                  <Inline source={l} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            <Inline source={b.lines[0] ?? ""} />
          </p>
        );
      })}
    </div>
  );
}
