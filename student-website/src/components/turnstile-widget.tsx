"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; theme: "light" }) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi; }
}

export function TurnstileWidget({ onTokenChange }: { onTokenChange: (token: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!siteKey || !loaded || !container.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      callback: token => onTokenChange(token),
      "expired-callback": () => onTokenChange(null),
      "error-callback": () => onTokenChange(null),
      theme: "light",
    });
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [loaded, onTokenChange, siteKey]);

  if (!siteKey) return <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-inset ring-amber-200">Registration security is not configured yet.</p>;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setLoaded(true)} /><div ref={container} /></>;
}
