import Image from "next/image";

export function StudentBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center overflow-hidden rounded-xl bg-slate-950 shadow-sm ring-1 ring-slate-200">
        <Image
          src="/teza-tech-lab-logo.svg"
          width={44}
          height={44}
          alt=""
          className="size-full object-cover"
          priority
        />
      </div>
      {!compact ? (
        <div>
          <p className="text-base font-bold tracking-tight text-slate-900">
            Teza Tech Lab
          </p>
          <p className="text-xs text-slate-500">Student portal</p>
        </div>
      ) : null}
    </div>
  );
}
