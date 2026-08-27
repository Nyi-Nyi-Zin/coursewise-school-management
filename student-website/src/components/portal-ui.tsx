import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortalPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="text-center">
      <p className="text-sm font-semibold text-teal-700">{eyebrow}</p>
      <h1 className="mt-1 text-4xl font-bold tracking-[-0.04em] text-slate-950">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
        {description}
      </p>
    </header>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  progress,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  progress?: number;
}) {
  return (
    <div className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_7px_22px_rgba(15,23,42,0.04)]">
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-600 ring-1 ring-inset ring-teal-100">
        <Icon className="size-7" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-1.5 truncate text-xs text-slate-500">{detail}</p>
        {typeof progress === "number" ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PortalPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white shadow-[0_7px_22px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

const statusStyles = {
  teal: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export function StatusPill({
  children,
  tone = "teal",
  icon: Icon,
}: {
  children: React.ReactNode;
  tone?: keyof typeof statusStyles;
  icon?: LucideIcon;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        statusStyles[tone],
      )}
    >
      {Icon ? <Icon className="size-3" strokeWidth={2.2} /> : null}
      {children}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 132,
  label = "Overall",
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const normalized = Math.min(100, Math.max(0, value));
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#0f766e ${normalized * 3.6}deg, #e8edf3 0deg)`,
      }}
      role="img"
      aria-label={`${normalized}% ${label.toLowerCase()}`}
    >
      <div className="grid size-[78%] place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_rgba(226,232,240,0.45)]">
        <div>
          <strong className="block text-3xl leading-none tracking-tight text-slate-950">
            {normalized}%
          </strong>
          <span className="mt-1 block text-xs text-slate-500">{label}</span>
        </div>
      </div>
    </div>
  );
}

export function EmptyPortalState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          <Icon className="size-7" />
        </span>
        <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export function formatPortalDate(value?: string | null, short = false) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-US", {
    month: short ? "short" : "long",
    day: "numeric",
    year: "numeric",
  });
}
