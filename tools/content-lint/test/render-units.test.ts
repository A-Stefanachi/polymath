// The tex filter used for the L18 KaTeX check formats units as tplkit.py does: micro is \mu, not the letter u (issue #14).
import { describe, expect, it } from "vitest";

import { applyFilter } from "../src/render.ts";

describe("tex filter units", () => {
  it("writes the micro prefix as \\mu", () => {
    expect(applyFilter(304e-6, "tex", "S", "S")).toBe("304\\,\\mu\\mathrm{S}");
    expect(applyFilter(47e-6, "tex", undefined, "A")).toBe("47\\,\\mu\\mathrm{A}");
    expect(applyFilter(2.5e-6, "tex", undefined, "ohm")).toBe("2.5\\,\\mu\\Omega");
  });

  it("leaves the other prefixes as before", () => {
    expect(applyFilter(1.51e-3, "tex", undefined, "A")).toBe("1.51\\,\\mathrm{mA}");
    expect(applyFilter(4.7e3, "tex", undefined, "ohm")).toBe("4.7\\,\\mathrm{k}\\Omega");
  });
});
