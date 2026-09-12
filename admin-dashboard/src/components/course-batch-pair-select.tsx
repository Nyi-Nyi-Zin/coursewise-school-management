import type { BatchRecord, CourseRecord } from "@/lib/course-batch-service";
import type { CourseBatchScope } from "@/lib/course-batch-scope";

export function CourseBatchPairSelect({
  value,
  courses,
  batches,
  onChange,
  loading = false,
  ariaLabel = "Filter by course and batch",
  placeholder,
  className = "h-9 min-w-52 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700",
}: {
  value: CourseBatchScope;
  courses: CourseRecord[];
  batches: BatchRecord[];
  onChange: (next: CourseBatchScope) => void;
  loading?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const courseById = new Map(courses.map(course => [course.id, course]));
  const linkedBatches = batches.filter(batch => courseById.has(batch.courseId));
  const selectedBatch = linkedBatches.find(
    batch => batch.id === value.batchId && batch.courseId === value.courseId
  );

  return (
    <select
      aria-label={ariaLabel}
      value={selectedBatch?.id ?? ""}
      onChange={event => {
        const batch = linkedBatches.find(item => item.id === event.target.value);
        onChange(batch ? { courseId: batch.courseId, batchId: batch.id } : { courseId: "", batchId: "" });
      }}
      className={className}
    >
      <option value="">
        {loading
          ? "Loading course–batch pairs…"
          : placeholder ?? "All course–batch pairs"}
      </option>
      {linkedBatches.map(batch => (
        <option key={batch.id} value={batch.id}>
          {courseById.get(batch.courseId)?.title} — {batch.name}
        </option>
      ))}
    </select>
  );
}
