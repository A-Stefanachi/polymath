// Safety check of a lesson figure (doc 07 section 15, rule LG1-SVG), the same rules as svg_problems() in
// polymath-app-spec/reference/validate_lessons.py: well-formed XML with an <svg> root, no script,
// foreignObject, image, use, iframe, object or embed element, no event attribute, no reference outside the
// document. The package is pure and has no XML dependency, so this is a small well-formedness parser: it
// accepts the XML subset a figure needs and rejects anything else (DOCTYPE and entity declarations too).
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const FORBIDDEN = new Set(["script", "foreignobject", "iframe", "object", "embed", "image", "use"]);
const NAME = /^[A-Za-z_][A-Za-z0-9_.-]*(?::[A-Za-z_][A-Za-z0-9_.-]*)?$/;
const ENTITY = /&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/;

type Element = { uri: string; local: string; attrs: { uri: string; local: string; value: string }[] };

class Malformed extends Error {}

function decode(v: string): string {
  return v
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_m, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

/** Parses `xml` into its elements in document order; throws Malformed. */
function parseElements(xml: string): Element[] {
  const out: Element[] = [];
  const stack: { name: string; scope: Map<string, string> }[] = [];
  let scope = new Map<string, string>([["xml", XML_NS]]);
  let roots = 0;
  let i = 0;
  const text = (s: string): void => {
    if (ENTITY.test(s)) throw new Malformed("undefined entity");
    if (stack.length === 0 && s.trim() !== "") throw new Malformed("text outside the root element");
  };
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    if (lt < 0) {
      text(xml.slice(i));
      break;
    }
    text(xml.slice(i, lt));
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4);
      if (end < 0) throw new Malformed("unterminated comment");
      i = end + 3;
    } else if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt);
      if (end < 0 || stack.length === 0) throw new Malformed("bad CDATA section");
      i = end + 3;
    } else if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt);
      if (end < 0) throw new Malformed("unterminated processing instruction");
      i = end + 2;
    } else if (xml.startsWith("<!", lt)) {
      throw new Malformed("DOCTYPE and entity declarations are not allowed");
    } else if (xml.startsWith("</", lt)) {
      const m = /^<\/([^\s>]+)\s*>/.exec(xml.slice(lt));
      const top = stack.pop();
      if (!m || !top || top.name !== m[1]) throw new Malformed("mismatched end tag");
      scope = top.scope;
      i = lt + m[0].length;
    } else {
      const head = /^<([^\s/>]+)/.exec(xml.slice(lt));
      if (!head || !NAME.test(head[1] ?? "")) throw new Malformed("bad element name");
      const name = head[1] ?? "";
      let p = lt + head[0].length;
      const raw: [string, string][] = [];
      const seen = new Set<string>();
      for (;;) {
        const a = /^\s+([^\s=/>]+)\s*=\s*("[^"<]*"|'[^'<]*')/.exec(xml.slice(p));
        if (!a) break;
        const an = a[1] ?? "";
        if (!NAME.test(an) || seen.has(an)) throw new Malformed("bad or duplicate attribute");
        seen.add(an);
        const value = (a[2] ?? "").slice(1, -1);
        if (ENTITY.test(value)) throw new Malformed("undefined entity");
        raw.push([an, decode(value)]);
        p += a[0].length;
      }
      const close = /^\s*(\/?)>/.exec(xml.slice(p));
      if (!close) throw new Malformed("malformed start tag");
      if (stack.length === 0 && ++roots > 1) throw new Malformed("more than one root element");
      const inner = new Map(scope);
      for (const [an, v] of raw) {
        if (an === "xmlns") inner.set("", v);
        else if (an.startsWith("xmlns:")) inner.set(an.slice(6), v);
      }
      const resolve = (qname: string, isAttr: boolean): { uri: string; local: string } => {
        const c = qname.indexOf(":");
        if (c < 0) return { uri: isAttr ? "" : (inner.get("") ?? ""), local: qname };
        const uri = inner.get(qname.slice(0, c));
        if (uri === undefined) throw new Malformed("unbound namespace prefix");
        return { uri, local: qname.slice(c + 1) };
      };
      const el: Element = { ...resolve(name, false), attrs: [] };
      for (const [an, v] of raw) {
        if (an === "xmlns" || an.startsWith("xmlns:")) continue;
        el.attrs.push({ ...resolve(an, true), value: v });
      }
      out.push(el);
      p += close[0].length;
      if (close[1] === "") stack.push({ name, scope });
      scope = close[1] === "" ? inner : scope;
      i = p;
    }
  }
  if (stack.length > 0) throw new Malformed("unclosed element");
  if (roots !== 1) throw new Malformed("no root element");
  return out;
}

/** Problems of one figure; an empty list means it is safe to show as an image. */
export function svgProblems(svg: string): string[] {
  let elements: Element[];
  try {
    elements = parseElements(svg);
  } catch (error) {
    return [`figure is not well-formed XML (${error instanceof Error ? error.message : "invalid"})`];
  }
  const out: string[] = [];
  const root = elements[0];
  if (!root || root.local !== "svg" || (root.uri !== "" && root.uri !== SVG_NS)) out.push("figure root element must be <svg>");
  for (const el of elements) {
    const name = el.local.toLowerCase();
    if (FORBIDDEN.has(name)) out.push(`figure uses forbidden element <${name}>`);
    for (const a of el.attrs) {
      const local = a.local.toLowerCase();
      if (local.startsWith("on")) out.push(`figure has event attribute ${local}`);
      const isHref = (a.uri === "" || a.uri === XLINK_NS) && a.local === "href";
      if (isHref && !a.value.startsWith("#")) out.push(`figure references outside the document (${a.value.slice(0, 40)})`);
      if (a.value.includes("url(") && !/^\s*url\(#[^)]+\)\s*$/.test(a.value)) out.push(`figure attribute ${local} uses a non-local url()`);
    }
  }
  return out;
}
