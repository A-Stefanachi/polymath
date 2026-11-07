// Lesson figures shown as image data URIs (00a K8, M5). On a phone in a browser night mode the white panel behind
// the image was repainted dark and the black ink vanished (founder, 7 Nov 2026), so the white paper is drawn
// inside the image itself, where page colour filters do not reach.
import { describe, expect, it } from "vitest";
import { svgDataUri, svgSize, withPaper } from "./figure.ts";

const PAPER = '<rect width="100%" height="100%" fill="#ffffff"/>';

describe("withPaper", () => {
  it("draws a white background first, inside the root element, so it sits under every stroke", () => {
    const out = withPaper('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0 H10"/></svg>');
    expect(out).toBe(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${PAPER}<path d="M0 0 H10"/></svg>`);
  });

  it("opens a self-closing root to hold the background", () => {
    expect(withPaper('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')).toBe(
      `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${PAPER}</svg>`,
    );
  });

  it("leaves text without an svg root unchanged", () => {
    expect(withPaper("<div/>")).toBe("<div/>");
  });
});

describe("svgDataUri", () => {
  it("is an image data URI of the figure on white paper", () => {
    const uri = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>');
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(uri.slice(uri.indexOf(",") + 1))).toContain(PAPER);
  });
});

describe("svgSize", () => {
  it("reads width and height, with a default when missing", () => {
    expect(svgSize('<svg width="300" height="100"/>')).toEqual({ width: 300, height: 100 });
    expect(svgSize("<svg/>")).toEqual({ width: 260, height: 150 });
  });
});
