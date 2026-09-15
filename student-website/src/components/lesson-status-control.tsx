"use client";

import { type Lesson } from "@/lib/student-data";
import { MobileSelect } from "@/components/ui/mobile-select";
import { cn } from "@/lib/utils";

const statusControlStyles: Record<Lesson["status"], string> = {
  new: "border-blue-200 bg-blue-50 text-blue-600",
  continue: "border-amber-200 bg-amber-50 text-amber-700",
  complete: "border-teal-200 bg-teal-50 text-teal-700",
};

const statusOptions: { value: Lesson["status"]; label: string }[] = [
  { value: "new", label: "New" },
  { value: "continue", label: "In progress" },
  { value: "complete", label: "Completed" },
];

export function LessonStatusControl({
  lessonTitle,
  status,
  disabled,
  pending,
  onChange,
}: {
  lessonTitle: string;
  status: Lesson["status"];
  disabled: boolean;
  pending: boolean;
  onChange: (status: Lesson["status"]) => void;
}) {
  return (
    <MobileSelect
      value={status}
      options={statusOptions}
      disabled={disabled || pending}
      onValueChange={onChange}
      ariaLabel={`Set status for ${lessonTitle}`}
      className={cn(
        "h-9 w-auto rounded-full py-1 pl-3 pr-2 text-[11px] font-semibold sm:text-xs",
        statusControlStyles[status],
        disabled || pending ? "cursor-not-allowed opacity-60" : "hover:brightness-95",
      )}
    />
  );
}
