"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select } from "@base-ui/react/select";
import { cn } from "@/lib/utils";

export type MobileSelectOption<T extends string> = {
  value: T;
  label: string;
};

export function MobileSelect<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  disabled = false,
  className,
}: {
  value: T;
  options: readonly MobileSelectOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select.Root
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={nextValue => {
        if (nextValue !== null) onValueChange(nextValue as T);
      }}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          "group flex h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-[13px] font-medium text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm",
          className,
        )}
      >
        <Select.Value className="min-w-0 truncate" />
        <Select.Icon>
          <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform duration-150 group-data-[popup-open]:rotate-180" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} align="start" alignItemWithTrigger={false} className="z-[80] max-w-[calc(100vw-1.5rem)]">
          <Select.Popup className="w-max min-w-[var(--anchor-width)] max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.16)] outline-none">
            <Select.List className="max-h-[min(16rem,var(--available-height))] overflow-y-auto">
              {options.map(option => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none data-[highlighted]:bg-slate-50 data-[selected]:bg-teal-50 data-[selected]:text-teal-700 sm:text-sm"
                >
                  <Select.ItemText className="min-w-0 flex-1 whitespace-nowrap">{option.label}</Select.ItemText>
                  <Select.ItemIndicator><Check className="size-4 shrink-0" /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
