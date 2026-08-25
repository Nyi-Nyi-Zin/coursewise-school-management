"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ReactNode } from "react";

type DataTableProps = {
  title: string;
  subtitle: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children: ReactNode;
};

export function DataTable({ title, subtitle, searchValue, onSearchChange, searchPlaceholder, children }: DataTableProps) {
  return <div className="overflow-hidden rounded-2xl border border-stone-200">
    <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
      <div><p className="font-bold">{title}</p><p className="text-xs text-stone-500">{subtitle}</p></div>
      {onSearchChange ? <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} /><input value={searchValue ?? ""} onChange={event => onSearchChange(event.target.value)} className="h-10 w-full rounded-xl border border-stone-200 pl-9 pr-3 text-sm sm:w-56" placeholder={searchPlaceholder} /></label> : null}
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">{children}</table></div>
  </div>;
}

export function TablePagination({ page, canGoNext, onPrevious, onNext }: { page: number; canGoNext: boolean; onPrevious: () => void; onNext: () => void }) {
  return <nav aria-label="Table pagination" className="flex items-center justify-between border-t border-stone-100 px-4 py-3 text-sm">
    <p className="text-stone-500">Page {page + 1}</p>
    <div className="flex gap-2">
      <button type="button" disabled={page === 0} onClick={onPrevious} className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-200 px-3 font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15} />Previous</button>
      <button type="button" disabled={!canGoNext} onClick={onNext} className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-200 px-3 font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight size={15} /></button>
    </div>
  </nav>;
}
