import type { LucideIcon } from "lucide-react";

const tones = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-500",
  amber: "bg-amber-50 text-amber-600",
} as const;

export type MetricTone = keyof typeof tones;

export function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: MetricTone }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-stone-900">{value}</p>
      </div>
    </div>
  );
}
