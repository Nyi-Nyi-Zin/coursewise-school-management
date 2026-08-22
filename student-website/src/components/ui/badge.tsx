import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300 ring-1 ring-inset ring-sky-400/20", className)} {...props} />;
}
