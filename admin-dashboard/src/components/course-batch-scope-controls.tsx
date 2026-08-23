"use client";

import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { hasFirebaseConfiguration } from "../lib/firebase";
import { loadBatches, loadCourses } from "../lib/course-batch-service";
import type { CourseBatchScope } from "../lib/course-batch-scope";

export function CourseBatchScopeControls({ value, onChange }: { value: CourseBatchScope; onChange: (next: CourseBatchScope) => void }) {
  const courses = useQuery({ queryKey: ["admin", "scope", "courses"], queryFn: loadCourses, enabled: hasFirebaseConfiguration });
  const batches = useQuery({ queryKey: ["admin", "scope", "batches", value.courseId], queryFn: () => loadBatches(value.courseId), enabled: hasFirebaseConfiguration && Boolean(value.courseId) });
  const courseItems = courses.data ?? [];
  const batchItems = batches.data ?? [];

  return <section className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
    <div className="flex items-center gap-2 pr-2 text-emerald-900"><Filter size={17} /><div><p className="text-sm font-bold">Active course and batch</p><p className="text-xs text-emerald-800/70">Quiz attempts and attendance stay inside this selected boundary.</p></div></div>
    {hasFirebaseConfiguration ? <>
      <label className="min-w-44 text-xs font-bold text-emerald-900">Course
        <select value={value.courseId} onChange={event => onChange({ courseId: event.target.value, batchId: "" })} className="mt-1 block h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal">
          <option value="">{courses.isLoading ? "Loading courses…" : "Select course"}</option>
          {courseItems.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select>
      </label>
      <label className="min-w-44 text-xs font-bold text-emerald-900">Batch
        <select value={value.batchId} onChange={event => onChange({ ...value, batchId: event.target.value })} disabled={!value.courseId} className="mt-1 block h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal disabled:opacity-50">
          <option value="">{batches.isLoading ? "Loading batches…" : "Select batch"}</option>
          {batchItems.map(batch => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
        </select>
      </label>
    </> : <>
      <label className="min-w-44 text-xs font-bold text-emerald-900">Course ID<input value={value.courseId} onChange={event => onChange({ courseId: event.target.value, batchId: value.batchId })} className="mt-1 block h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal" placeholder="Local course ID" /></label>
      <label className="min-w-44 text-xs font-bold text-emerald-900">Batch ID<input value={value.batchId} onChange={event => onChange({ courseId: value.courseId, batchId: event.target.value })} className="mt-1 block h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal" placeholder="Local batch ID" /></label>
    </>}
  </section>;
}
