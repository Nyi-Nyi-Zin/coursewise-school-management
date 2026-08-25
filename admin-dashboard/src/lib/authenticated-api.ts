"use client";

import { getFirebaseClient } from "@/lib/firebase";

export async function authenticatedApiFetch(input: string, init?: RequestInit) {
  const user = getFirebaseClient().auth.currentUser;
  if (!user) throw new Error("Sign in before using administrator tools.");
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${await user.getIdToken()}`);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(input, { ...init, headers, cache: "no-store" });
  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  if (!response.ok) throw new Error(payload?.message || payload?.error || "The server request failed.");
  return payload;
}
