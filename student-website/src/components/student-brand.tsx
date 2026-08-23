export function StudentBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-emerald-200 shadow-sm">
        <img src="/teza-tech-lab-logo.svg" alt="" className="size-full object-cover" />
      </div>
      {!compact ? <div><p className="text-sm font-bold tracking-tight text-stone-800">Teza Tech Lab</p><p className="text-xs text-stone-500">Student portal</p></div> : null}
    </div>
  );
}
