"use client";

import * as React from "react";
import { Legend, ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label?: string; color?: string }>;
type ChartValue = number | string | ReadonlyArray<number | string>;
type ChartName = number | string;
type ChartTooltipEntry = { dataKey?: unknown; name?: unknown; value?: unknown; color?: string };
type ChartTooltipContentProps = { active?: boolean; payload?: readonly ChartTooltipEntry[]; label?: string | number };

const ChartContext = React.createContext<ChartConfig>({});

export function ChartContainer({ config, className, children }: { config: ChartConfig; className?: string; children: React.ReactElement }) {
  const variables = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [`--color-${key}`, value.color ?? "#143d36"]),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={config}>
      <div className={cn("h-[260px] w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-stone-400 [&_.recharts-cartesian-grid_line]:stroke-stone-100 [&_.recharts-tooltip-cursor]:fill-stone-100", className)} style={variables}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip(props: TooltipProps<ChartValue, ChartName>) {
  return <Tooltip {...props} />;
}

export function ChartTooltipContent({ active, payload, label }: ChartTooltipContentProps) {
  const config = React.useContext(ChartContext);
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-32 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label ? <p className="mb-1 font-bold text-stone-700">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((entry, index) => {
            const key = String(entry.dataKey ?? entry.name ?? index);
            const item = config[key];
          return (
            <div key={`${key}-${index}`} className="flex items-center justify-between gap-4 text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.color ?? item?.color ?? "#143d36" }} />
                {item?.label ?? String(entry.name ?? key)}
              </span>
              <span className="font-bold text-stone-800">{String(entry.value ?? "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = Legend;
