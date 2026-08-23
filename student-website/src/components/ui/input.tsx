import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60", className)} {...props} />;
}
