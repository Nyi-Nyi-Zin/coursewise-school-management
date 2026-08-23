import { describe, expect, it } from "vitest";
import { translatePortalText } from "../../../shared/portal-i18n";

describe("portal localization resources", () => {
  it("provides stable English and Burmese navigation labels", () => {
    expect(translatePortalText("en", "gradebook")).toBe("Gradebook");
    expect(translatePortalText("my", "attendance")).toBe("တက်ရောက်မှု");
    expect(translatePortalText("my", "notifications")).toBe("အကြောင်းကြားချက်များ");
  });
});
