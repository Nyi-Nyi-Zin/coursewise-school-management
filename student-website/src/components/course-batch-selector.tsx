"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { Select } from "@base-ui/react/select";
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
  // Keep the active enrollment available while the complete list is loading
  // or when an older Firestore ruleset prevents the list query. This keeps the
  // course/batch control visible instead of removing it from the mobile menu.
  const fetchedEnrollments = enrollmentsQuery.data ?? emptyEnrollments;
  const enrollments = useMemo(
    () => fetchedEnrollments.length || !active ? fetchedEnrollments : [active],
    [active, fetchedEnrollments],
  );
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
  if (enrollments.length === 1) return <p className={`truncate text-xs font-semibold text-teal-700 sm:text-sm ${className}`}>{enrollments[0].courseTitle} &mdash; {enrollments[0].batchName}</p>;
  const items = enrollments.map(item => ({
    value: enrollmentKey(item),
    label: `${item.courseTitle} — ${item.batchName}`,
  }));
  return <div className={`relative inline-flex min-w-0 items-center ${className}`}>
    <Select.Root items={items} value={value} onValueChange={nextValue => { if (nextValue !== null) onChange(nextValue); }}>
      <Select.Trigger aria-label="Course and batch" className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:text-sm">
        <Select.Value className="truncate" />
        <Select.Icon><ChevronDown className="size-4 shrink-0 text-slate-400" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} align="start" alignItemWithTrigger={false} className="z-[60] max-w-[calc(100vw-2rem)]">
          <Select.Popup className="w-[var(--anchor-width)] max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl outline-none">
            <Select.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto">
              {items.map(item => <Select.Item key={item.value} value={item.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none data-[highlighted]:bg-slate-100 data-[selected]:bg-teal-50 data-[selected]:text-teal-700 sm:text-sm">
                <Select.ItemText className="min-w-0 flex-1 break-words">{item.label}</Select.ItemText>
                <Select.ItemIndicator><Check className="size-4 shrink-0" /></Select.ItemIndicator>
              </Select.Item>)}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  </div>;
}
