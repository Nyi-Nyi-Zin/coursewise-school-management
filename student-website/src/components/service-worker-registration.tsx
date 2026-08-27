"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function ServiceWorkerRegistration() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDismissed(false);
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  if (!installPrompt || dismissed) return null;

  return (
    <aside
      aria-label="Install Teza Student"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl"
    >
      <Image src="/icon-192x192.png" alt="" width={44} height={44} className="size-11 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Teza Student</p>
        <p className="text-xs text-slate-600">Open faster from your home screen.</p>
      </div>
      <button
        type="button"
        onClick={installApp}
        className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install prompt"
        className="rounded-lg px-2 py-2 text-lg leading-none text-slate-500"
      >
        {"\u00d7"}
      </button>
    </aside>
  );
}
