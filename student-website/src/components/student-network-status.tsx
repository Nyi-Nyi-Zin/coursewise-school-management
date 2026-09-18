"use client";

import { CheckCircle2, CloudOff, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type NetworkStatus = "online" | "offline" | "reconnecting" | "restored";

const CONNECTION_PROBE_TIMEOUT_MS = 5_000;
const RETRY_DELAY_MS = 4_000;
const RESTORED_MESSAGE_DURATION_MS = 4_000;

async function canReachPortal(signal: AbortSignal) {
  try {
    const response = await fetch(`/icon-32x32.png?connection-check=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function StudentNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>("online");
  const retryTimer = useRef<number | null>(null);
  const restoredTimer = useRef<number | null>(null);
  const probeController = useRef<AbortController | null>(null);
  const checkConnectionRef = useRef<(() => void) | null>(null);

  const clearTimers = useCallback(() => {
    if (retryTimer.current) window.clearTimeout(retryTimer.current);
    if (restoredTimer.current) window.clearTimeout(restoredTimer.current);
    probeController.current?.abort();
    retryTimer.current = null;
    restoredTimer.current = null;
    probeController.current = null;
  }, []);

  const checkConnection = useCallback(async () => {
    clearTimers();

    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }

    setStatus("reconnecting");

    const controller = new AbortController();
    probeController.current = controller;
    const timeout = window.setTimeout(
      () => controller.abort(),
      CONNECTION_PROBE_TIMEOUT_MS,
    );
    const connected = await canReachPortal(controller.signal);
    window.clearTimeout(timeout);
    if (probeController.current !== controller) return;
    probeController.current = null;

    if (connected && navigator.onLine) {
      setStatus("restored");
      restoredTimer.current = window.setTimeout(
        () => setStatus("online"),
        RESTORED_MESSAGE_DURATION_MS,
      );
      return;
    }

    setStatus("offline");
    retryTimer.current = window.setTimeout(() => {
      void checkConnectionRef.current?.();
    }, RETRY_DELAY_MS);
  }, [clearTimers]);

  useEffect(() => {
    checkConnectionRef.current = () => void checkConnection();
    return () => {
      checkConnectionRef.current = null;
    };
  }, [checkConnection]);

  useEffect(() => {
    const handleOffline = () => {
      clearTimers();
      setStatus("offline");
    };
    const handleOnline = () => void checkConnection();

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (!navigator.onLine) handleOffline();

    return () => {
      clearTimers();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkConnection, clearTimers]);

  if (status === "online") return null;

  const isOffline = status === "offline";
  const isRestored = status === "restored";
  const Icon = isOffline ? CloudOff : isRestored ? CheckCircle2 : LoaderCircle;

  return (
    <div
      className="fixed inset-x-0 top-2 z-[70] px-3 sm:px-4"
      data-network-status={status}
      role={isOffline ? "alert" : "status"}
      aria-live="polite"
    >
      <div
        className={cn(
          "mx-auto flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur",
          isOffline && "border-rose-200 bg-rose-50/95 text-rose-950",
          status === "reconnecting" && "border-amber-200 bg-amber-50/95 text-amber-950",
          isRestored && "border-emerald-200 bg-emerald-50/95 text-emerald-950",
        )}
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            isOffline && "bg-rose-100 text-rose-700",
            status === "reconnecting" && "bg-amber-100 text-amber-700",
            isRestored && "bg-emerald-100 text-emerald-700",
          )}
        >
          <Icon className={cn("size-5", status === "reconnecting" && "animate-spin")} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isOffline ? "No internet connection" : isRestored ? "Back online" : "Reconnecting…"}
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            {isOffline
              ? "Some portal data may be unavailable. We’ll keep trying to reconnect."
              : isRestored
                ? "Your connection has been restored."
                : "Checking your connection. Please wait."}
          </p>
        </div>
      </div>
    </div>
  );
}
