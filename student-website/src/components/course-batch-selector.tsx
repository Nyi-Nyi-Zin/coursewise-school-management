"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getStudentEnrollments, type EnrollmentContext } from "@/lib/student-repository";

const enrollmentKey = (item: Pick<EnrollmentContext, "courseId" | "batchId">) => `${item.courseId}:${item.batchId}`;
const selectionEvent = "coursewise:student-scope-change";
const emptyEnrollments: EnrollmentContext[] = [];

export function useCourseBatchSelection() {
  const { user } = useStudentAuth();
  const { enrollment: active } = useStudentCourse();
  const storageKey = `coursewise:student-scope:v1:${user?.uid ?? "demo"}`;
  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments", user?.uid],
    queryFn: () => getStudentEnrollments(user!.uid),
    enabled: Boolean(user?.uid) || !isFirebaseConfigured,
  });
  const enrollments = enrollmentsQuery.data ?? emptyEnrollments;
  const subscribe = useCallback((notify: () => void) => {
    const syncSelection = () => notify();
    const syncStoredSelection = (event: StorageEvent) => {
      if (event.key === storageKey) notify();
    };
    window.addEventListener(selectionEvent, syncSelection);
    window.addEventListener("storage", syncStoredSelection);
    return () => {
      window.removeEventListener(selectionEvent, syncSelection);
      window.removeEventListener("storage", syncStoredSelection);
    };
  }, [storageKey]);
  const getStoredSelection = useCallback(() => {
    try { return window.localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
  }, [storageKey]);
  const storedKey = useSyncExternalStore(subscribe, getStoredSelection, () => "");

  const activeKey = active ? enrollmentKey(active) : "";
  const selectedKey = enrollments.some(item => enrollmentKey(item) === storedKey) ? storedKey
    : enrollments.some(item => enrollmentKey(item) === activeKey) ? activeKey
    : enrollments[0] ? enrollmentKey(enrollments[0]) : "";
  const enrollment = useMemo(() => enrollments.find(item => enrollmentKey(item) === selectedKey)
    ?? (active && enrollments.some(item => enrollmentKey(item) === enrollmentKey(active)) ? active : enrollments[0])
    ?? null, [active, enrollments, selectedKey]);

  const selectEnrollment = (key: string) => {
    if (!enrollments.some(item => enrollmentKey(item) === key)) return;
    try { window.localStorage.setItem(storageKey, key); } catch { /* optional */ }
    window.dispatchEvent(new Event(selectionEvent));
  };
  const selectionReady = enrollmentsQuery.isSuccess && (!enrollments.length || Boolean(enrollment));
  return { enrollment, enrollments, enrollmentsQuery, selectionReady, selectedKey: enrollment ? enrollmentKey(enrollment) : "", selectEnrollment };
}

export function CourseBatchSelector({ enrollments, value, onChange, className = "" }: {
  enrollments: EnrollmentContext[]; value: string; onChange: (value: string) => void; className?: string;
}) {
  if (!enrollments.length) return null;
  if (enrollments.length === 1) return <p className={`truncate text-sm font-semibold text-teal-700 ${className}`}>{enrollments[0].courseTitle} &mdash; {enrollments[0].batchName}</p>;
  return <label className={`relative inline-flex min-w-0 items-center ${className}`}>
    <span className="sr-only">Select course and batch</span>
    <select aria-label="Course and batch" value={value} onChange={event => onChange(event.target.value)} className="h-11 max-w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
      {enrollments.map(item => <option key={enrollmentKey(item)} value={enrollmentKey(item)}>{item.courseTitle} &mdash; {item.batchName}</option>)}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 size-4 text-slate-400" />
  </label>;
}
