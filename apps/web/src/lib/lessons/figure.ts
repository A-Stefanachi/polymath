// Lesson figures (00a K8, M5) are shown only as images: SVG text is never put into the page as markup, so no script
// in it can run.

const PAPER = '<rect width="100%" height="100%" fill="#ffffff"/>';

/**
 * The figure on white paper. Figures draw in currentColor, which is black inside an <img>. A white panel behind the
 * image was not enough: a browser night mode repainted it dark and the ink vanished (founder's phone, 7 Nov 2026).
 * A background drawn inside the image is not touched by page colour filters.
 */
export function withPaper(svg: string): string {
  const root = /<svg\b[^>]*?(\/?)>/.exec(svg);
  if (!root) return svg;
  const [tag, selfClosing] = root;
  const at = root.index + tag.length;
  if (selfClosing === "/") return `${svg.slice(0, root.index)}${tag.slice(0, -2)}>${PAPER}</svg>${svg.slice(at)}`;
  return `${svg.slice(0, at)}${PAPER}${svg.slice(at)}`;
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withPaper(svg))}`;
}

/** The width and height attributes of the root element, for the image box; a default when they are missing. */
export function svgSize(svg: string): { width: number; height: number } {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? "";
  const pick = (name: string): number => {
    const n = Number(new RegExp(`\\s${name}="([0-9.]+)"`).exec(root)?.[1]);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return { width: pick("width") || 260, height: pick("height") || 150 };
}
