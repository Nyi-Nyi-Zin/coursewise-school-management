import { describe, expect, it } from "vitest";
import {
  createEmailActionContinueUrl,
  resolveEmailActionReturnUrl,
} from "../../../shared/email-action-url";

describe("email action return URLs", () => {
  it("creates a login continue URL for the portal that requested the email", () => {
    expect(createEmailActionContinueUrl("https://student.example.com")).toBe(
      "https://student.example.com/login"
    );
  });

  it("returns to the login page on a Firebase-authorized HTTPS origin", () => {
    expect(
      resolveEmailActionReturnUrl(
        "https://admin.example.com/somewhere?temporary=value#section",
        "/login",
        ["https://admin.example.com", "https://student.example.com"]
      )
    ).toBe("https://admin.example.com/login");
  });

  it("allows local HTTP development but rejects unsafe return URLs", () => {
    expect(
      resolveEmailActionReturnUrl("http://localhost:3001/reset-password")
    ).toBe("http://localhost:3001/login");
    expect(
      resolveEmailActionReturnUrl("http://example.com/reset-password")
    ).toBe("/login");
    expect(resolveEmailActionReturnUrl("javascript:alert(1)")).toBe("/login");
    expect(
      resolveEmailActionReturnUrl("https://attacker.example/login", "/login", [
        "https://student.example.com",
      ])
    ).toBe("/login");
    expect(
      resolveEmailActionReturnUrl(
        "https://student.example.com@attacker.example/login",
        "/login",
        ["https://student.example.com"]
      )
    ).toBe("/login");
    expect(
      resolveEmailActionReturnUrl("//attacker.example/login", "/login", [
        "https://student.example.com",
      ])
    ).toBe("/login");
  });
});
