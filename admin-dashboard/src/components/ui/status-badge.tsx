export type StatusTone = "green" | "amber" | "gray" | "red";

const toneClasses: Record<StatusTone, string> = {
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  gray: "bg-stone-100 text-stone-500",
  red: "bg-red-50 text-red-700",
};

export function StatusBadge({ label, tone = "gray" }: { label: string; tone?: StatusTone }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${toneClasses[tone]}`}>{label}</span>;
}

export function BooleanStatusBadge({ active, trueLabel = "Active", falseLabel = "Inactive", trueTone = "green", falseTone = "red" }: { active: boolean; trueLabel?: string; falseLabel?: string; trueTone?: StatusTone; falseTone?: StatusTone }) {
  return <StatusBadge label={active ? trueLabel : falseLabel} tone={active ? trueTone : falseTone} />;
}
