"use client";

import { getFirebaseClient } from "@/lib/firebase";

export async function authenticatedApiFetch(input: string, init?: RequestInit) {
  const user = getFirebaseClient().auth.currentUser;
  if (!user) throw new Error("Sign in before using administrator tools.");
  const headers = new Headers(init?.headers);
  // Server-side administrator routes reject revoked tokens. Always refresh
  // before a privileged request so a long-lived dashboard tab cannot send an
  // outdated cached token after Firebase has rotated the session.
  headers.set("authorization", `Bearer ${await user.getIdToken(true)}`);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(input, { ...init, headers, cache: "no-store" });
  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  if (!response.ok) throw new Error(payload?.message || payload?.error || "The server request failed.");
  return payload;
}
