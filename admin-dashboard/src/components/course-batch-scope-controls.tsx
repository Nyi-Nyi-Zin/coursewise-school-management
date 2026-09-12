"use client";

import { useQuery } from "@tanstack/react-query";
import { CourseBatchPairSelect } from "./course-batch-pair-select";
import { hasFirebaseConfiguration } from "../lib/firebase";
import { loadAllBatches, loadCourses } from "../lib/course-batch-service";
import type { CourseBatchScope } from "../lib/course-batch-scope";

export function CourseBatchScopeControls({ value, onChange }: { value: CourseBatchScope; onChange: (next: CourseBatchScope) => void }) {
  const courses = useQuery({ queryKey: ["admin", "scope", "courses"], queryFn: loadCourses, enabled: hasFirebaseConfiguration });
  const batches = useQuery({ queryKey: ["admin", "scope", "batches"], queryFn: loadAllBatches, enabled: hasFirebaseConfiguration });

  return <section className="flex flex-wrap items-end gap-3">
    <label className="min-w-56 text-xs font-bold text-emerald-900">Course &amp; batch
      <CourseBatchPairSelect
        value={value}
        courses={courses.data ?? []}
        batches={batches.data ?? []}
        onChange={onChange}
        loading={courses.isLoading || batches.isLoading}
        className="mt-1 block h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal"
      />
    </label>
  </section>;
}
