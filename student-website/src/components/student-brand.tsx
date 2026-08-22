import { TerminalSquare } from "lucide-react";

export function StudentBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-slate-900 ring-1 ring-sky-400/30 shadow-[0_10px_24px_rgba(56,189,248,0.18)]">
        <TerminalSquare className="size-5 text-sky-400" aria-hidden="true" />
      </div>
      {!compact ? <div><p className="text-sm font-bold tracking-tight text-white">Teza Tech Lab</p><p className="text-xs text-slate-400">Student portal</p></div> : null}
    </div>
  );
}
