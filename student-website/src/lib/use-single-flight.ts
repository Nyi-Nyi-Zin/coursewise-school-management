"use client";

import { useCallback, useRef } from "react";

export function useSingleFlight() {
  const activeKeys = useRef(new Set<string>());

  return useCallback(async <T,>(key: string, action: () => Promise<T>): Promise<T | undefined> => {
    if (activeKeys.current.has(key)) return undefined;
    activeKeys.current.add(key);
    try {
      return await action();
    } finally {
      activeKeys.current.delete(key);
    }
  }, []);
}
