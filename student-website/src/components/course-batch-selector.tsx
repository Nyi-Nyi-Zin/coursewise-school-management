"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getStudentEnrollments, type EnrollmentContext } from "@/lib/student-repository";

const enrollmentKey = (item: Pick<EnrollmentContext, "courseId" | "batchId">) => `${item.courseId}:${item.batchId}`;

export function useCourseBatchSelection(pageKey: "home" | "lessons" | "quizzes" | "assignments") {
  const { user } = useStudentAuth();
  const { enrollment: active } = useStudentCourse();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const storageKey = `coursewise:student-scope:v1:${user?.uid ?? "demo"}:${pageKey}`;
  const enrollmentsQuery = useQuery({
    queryKey: ["student", "enrollments", user?.uid],
    queryFn: () => getStudentEnrollments(user!.uid),
    enabled: Boolean(user?.uid) || !isFirebaseConfigured,
  });
  const enrollments = enrollmentsQuery.data ?? [];

  useEffect(() => {
    if (!enrollments.length) return;
    let stored = "";
    try { stored = window.localStorage.getItem(storageKey) ?? ""; } catch { /* optional */ }
    const activeKey = active ? enrollmentKey(active) : "";
    const nextKey = enrollments.some(item => enrollmentKey(item) === stored) ? stored
      : enrollments.some(item => enrollmentKey(item) === activeKey) ? activeKey
      : enrollmentKey(enrollments[0]);
    setSelectedKey(nextKey);
    try { window.localStorage.setItem(storageKey, nextKey); } catch { /* optional */ }  }, [active, enrollments, storageKey]);

  const enrollment = useMemo(() => enrollments.find(item => enrollmentKey(item) === selectedKey)
    ?? (active && enrollments.some(item => enrollmentKey(item) === enrollmentKey(active)) ? active : enrollments[0])
    ?? null, [active, enrollments, selectedKey]);

  const selectEnrollment = (key: string) => {
    if (!enrollments.some(item => enrollmentKey(item) === key)) return;
    setSelectedKey(key);
    try { window.localStorage.setItem(storageKey, key); } catch { /* optional */ }
  };
  const selectionReady = enrollmentsQuery.isSuccess && (!enrollments.length || selectedKey !== null);
  return { enrollment, enrollments, enrollmentsQuery, selectionReady, selectedKey: enrollment ? enrollmentKey(enrollment) : "", selectEnrollment };
}

export function CourseBatchSelector({ enrollments, value, onChange, className = "" }: {
  enrollments: EnrollmentContext[]; value: string; onChange: (value: string) => void; className?: string;
}) {
  if (!enrollments.length) return null;
  if (enrollments.length === 1) return <p className={`text-sm font-semibold text-teal-700 ${className}`}>{enrollments[0].courseTitle} &mdash; {enrollments[0].batchName}</p>;
  return <label className={`relative inline-flex min-w-0 items-center ${className}`}>
    <span className="sr-only">Select course and batch</span>
    <select aria-label="Course and batch" value={value} onChange={event => onChange(event.target.value)} className="h-11 max-w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
      {enrollments.map(item => <option key={enrollmentKey(item)} value={enrollmentKey(item)}>{item.courseTitle} &mdash; {item.batchName}</option>)}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 size-4 text-slate-400" />
  </label>;
}
