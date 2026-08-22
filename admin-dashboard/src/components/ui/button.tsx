import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]", { variants: { variant: { default: "bg-emerald-900 text-white hover:bg-emerald-800", outline: "border border-stone-200 bg-white text-emerald-900 hover:bg-emerald-50", ghost: "text-stone-600 hover:bg-stone-100" }, size: { default: "h-10 px-4", sm: "h-9 px-3 text-xs", icon: "size-10" } }, defaultVariants: { variant: "default", size: "default" } });
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
