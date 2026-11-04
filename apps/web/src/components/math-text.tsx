import katex from "katex";

/** Text with `$...$` spans typeset by KaTeX (trust off: no \href or raw HTML). Server-renderable. */
export function MathText({ source }: { source: string }) {
  const parts = source.split(/\$([^$]+)\$/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          part
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part, { throwOnError: false, trust: false }) }} />
        ),
      )}
    </>
  );
}
