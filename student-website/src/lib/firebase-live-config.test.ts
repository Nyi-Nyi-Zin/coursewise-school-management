import { describe, expect, it } from "vitest";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseEnabled = process.env.NEXT_PUBLIC_ENABLE_FIREBASE === "true";

describe.runIf(firebaseEnabled && Boolean(apiKey))("Firebase Web App configuration", () => {
  it("is accepted by Firebase Identity Toolkit without submitting user data", async () => {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    const payload = (await response.json()) as { error?: { message?: string } };
    const message = payload.error?.message ?? "";

    expect(response.status).toBe(400);
    expect(message).not.toMatch(/API_KEY_INVALID|API key not valid|PROJECT_NOT_FOUND|PERMISSION_DENIED/i);
  });
});
