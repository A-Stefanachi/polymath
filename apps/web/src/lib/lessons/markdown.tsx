import katex from "katex";
import type { ReactNode } from "react";

// The small Markdown subset that concept primers use (schemas/lesson.schema.json, doc 07 section 15):
// paragraphs, numbered and bulleted lists, **bold**, *italic*, inline math $...$ and display math $$...$$.
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

type Block = { kind: "p" | "math" | "ol" | "ul"; lines: string[]; start?: number };

const ORDERED = /^\s*(\d+)\.\s+(.*)$/s;
const BULLET = /^\s*[-*]\s+(.*)$/s;

function blocksOf(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.trim().split(/\n\s*\n/)) {
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
