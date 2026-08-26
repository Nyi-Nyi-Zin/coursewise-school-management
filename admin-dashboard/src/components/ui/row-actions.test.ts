import { describe, expect, it } from "vitest";
import { calculateMenuPosition } from "./row-actions-position";

describe("calculateMenuPosition", () => {
  it("anchors a short menu directly above a low trigger using its actual height", () => {
    const position = calculateMenuPosition({
      trigger: { top: 700, right: 1000, bottom: 736 },
      menuWidth: 224,
      menuHeight: 96,
      viewportWidth: 1024,
      viewportHeight: 768,
    });

    expect(position).toEqual({ top: 598, left: 776 });
    expect(700 - (position.top + 96)).toBe(6);
  });

  it("anchors a tall menu directly below a high trigger", () => {
    const position = calculateMenuPosition({
      trigger: { top: 72, right: 300, bottom: 108 },
      menuWidth: 224,
      menuHeight: 270,
      viewportWidth: 360,
      viewportHeight: 800,
    });

    expect(position).toEqual({ top: 114, left: 76 });
    expect(position.top - 108).toBe(6);
  });
});
