// The feedback panel states its title once: the grader's message drops a lead-in that repeats it.
import { describe, expect, it } from "vitest";
import { feedbackBody } from "./item-card";

describe("feedbackBody", () => {
  it("drops a lead-in equal to the panel title", () => {
    expect(feedbackBody("Not quite. Check your method and units.", "Not quite.")).toBe("Check your method and units.");
    expect(feedbackBody("Correct.", "Correct.")).toBe("");
  });

  it("keeps a message that does not start with the title, and handles no message", () => {
    expect(feedbackBody("Check the unit.", "Not quite.")).toBe("Check the unit.");
    expect(feedbackBody(undefined, "Correct.")).toBe("");
  });
});
