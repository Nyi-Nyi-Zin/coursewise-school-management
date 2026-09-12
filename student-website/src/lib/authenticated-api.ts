"use client";

import { firebaseAuth } from "@/lib/firebase";
import { getUserFacingErrorMessage } from "../../../shared/user-facing-errors";

export async function authenticatedApiFetch(input: string, init?: RequestInit) {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error("Sign in to continue.");
  const token = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(input, { ...init, headers, cache: "no-store" });
  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(getUserFacingErrorMessage(
      new Error(payload?.message || payload?.error || ""),
      "The server request failed. Please try again.",
    ));
  }
  return payload;
}
