"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { Toaster } from "sonner";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } } }));
  return <QueryClientProvider client={queryClient}>{children}<Toaster richColors position="top-center" />{process.env.NODE_ENV === "development" ? <ReactQueryDevtools initialIsOpen={false} /> : null}</QueryClientProvider>;
}
