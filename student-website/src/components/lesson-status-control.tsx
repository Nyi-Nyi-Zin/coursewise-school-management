"use client";

import { ChevronDown } from "lucide-react";
import { type Lesson } from "@/lib/student-data";
import { cn } from "@/lib/utils";

const statusControlStyles: Record<Lesson["status"], string> = {
  new: "border-blue-200 bg-blue-50 text-blue-600",
  continue: "border-amber-200 bg-amber-50 text-amber-700",
  complete: "border-teal-200 bg-teal-50 text-teal-700",
};

export function LessonStatusControl({ lessonTitle, status, disabled, pending, onChange }: { lessonTitle: string; status: Lesson["status"]; disabled: boolean; pending: boolean; onChange: (status: Lesson["status"]) => void }) {
  return (
    <label className={cn(
      "flex items-center gap-0.5 rounded-full border py-1 pl-3 pr-1.5 text-[10px] font-semibold transition",
      statusControlStyles[status],
      disabled || pending ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:brightness-95",
    )}>
      <span className="sr-only">Lesson status</span>
      <select
        value={status}
        disabled={disabled || pending}
        onChange={event => onChange(event.target.value as Lesson["status"])}
        aria-label={`Set status for ${lessonTitle}`}
        className="appearance-none bg-transparent pr-2 text-[10px] font-semibold outline-none disabled:cursor-not-allowed"
      >
        <option value="new">New</option>
        <option value="continue">In progress</option>
        <option value="complete">Completed</option>
      </select>
      <ChevronDown className="size-3.5" />
    </label>
  );
}