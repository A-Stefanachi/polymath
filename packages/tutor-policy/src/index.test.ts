import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as entry from "@polymath/tutor-policy";
import { PACKAGE_NAME } from "./index.ts";

describe("package wiring", () => {
  it("resolves its own name through the workspace to this entry point", () => {
    expect(entry.PACKAGE_NAME).toBe(PACKAGE_NAME);
  });

  it("declares the same name in package.json", () => {
    const manifest: unknown = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(manifest).toMatchObject({ name: PACKAGE_NAME, private: true });
  });
});
