import Image from "next/image";

export function StudentBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="grid size-12 place-items-center overflow-hidden rounded-[14px] bg-slate-950 shadow-sm ring-1 ring-slate-200">
        <Image
          src="/teza-tech-lab-logo.svg"
          width={48}
          height={48}
          alt=""
          className="size-full object-cover"
          priority
        />
      </div>
      {!compact ? (
        <div>
          <p className="text-[17px] font-bold tracking-tight text-slate-950">
            Teza Tech Lab
          </p>
          <p className="text-xs text-slate-500">Student portal</p>
        </div>
      ) : null}
    </div>
  );
}
