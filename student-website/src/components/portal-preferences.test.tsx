// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalPreferencesProvider, PreferenceControls } from "../../../shared/portal-preferences";

describe("portal preferences", () => {
  it("switches and persists the dark theme and Burmese locale", () => {
    render(<PortalPreferencesProvider><PreferenceControls /></PortalPreferencesProvider>);
    fireEvent.click(screen.getByLabelText("Toggle light and dark theme"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("teza-theme")).toBe("dark");
    fireEvent.click(screen.getByLabelText("Switch English and Burmese language preference"));
    expect(document.documentElement.lang).toBe("my");
    expect(window.localStorage.getItem("teza-locale")).toBe("my");
  });
});
