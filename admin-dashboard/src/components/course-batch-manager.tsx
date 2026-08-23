"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookPlus,
  Eye,
  Filter,
  Layers3,
  Pencil,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { DataTable, TablePagination } from "@/components/ui/data-table";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import {
  enrollStudent,
  deleteBatch,
  deleteCourse,
  deleteEnrollment,
  linkBatchToCourse,
  loadAllBatches,
  loadBatchesPage,
  loadCoursesPage,
  loadEnrollmentsPage,
  loadStudentProfiles,
  saveBatch,
  saveCourse,
  updateEnrollmentBatch,
  saveEnrollmentStatus,
  type BatchRecord,
  type CourseRecord,
  type EnrollmentRecord,
} from "@/lib/course-batch-service";

const coursesKey = ["admin", "courses"] as const;
const studentsKey = ["admin", "student-profiles"] as const;
const batchesKey = (courseId: string) =>
  ["admin", "batches", courseId] as const;
const allBatchesKey = ["admin", "batches", "all"] as const;
const enrollmentsKey = (courseId: string) => ["admin", "enrollments", courseId] as const;
const PAGE_SIZE = 10;
type Tab = "courses" | "batches" | "enrollment";

function batchSaveErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (code === "permission-denied") {
    return "Firebase denied this write. Confirm this account's users/{uid} document has role: admin and deploy the current Firestore rules.";
  }
  if (code === "unauthenticated") {
    return "Your Firebase sign-in has expired. Sign out, sign in again, and retry.";
  }
  if (code === "unavailable") {
    return "Firebase is temporarily unavailable. Check your connection and retry.";
  }

  const message = error instanceof Error ? error.message.replace(/^Firebase:\s*/i, "") : "";
  return message ? `The batch could not be saved: ${message}` : "The batch could not be saved. Please retry.";
}

export function CourseBatchManager() {
  const client = useQueryClient();
  const [localCourses, setLocalCourses] = useState<CourseRecord[]>([]);
  const [localBatches, setLocalBatches] = useState<
    Record<string, BatchRecord[]>
  >({});
  const [localEnrollments, setLocalEnrollments] = useState<EnrollmentRecord[]>([]);
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [tab, setTab] = useState<Tab>("courses");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [title, setTitle] = useState("");
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState("");
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [existingBatchId, setExistingBatchId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<{ title: string; fields: { label: string; value: ReactNode }[] } | null>(null);
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [coursePage, setCoursePage] = useState(0);
  const [courseCursors, setCourseCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [batchPage, setBatchPage] = useState(0);
  const [batchCursors, setBatchCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [enrollmentPage, setEnrollmentPage] = useState(0);
  const [enrollmentCursors, setEnrollmentCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const coursesQuery = useQuery({
    queryKey: [...coursesKey, coursePage],
    queryFn: () => loadCoursesPage(PAGE_SIZE, courseCursors[coursePage]),
    enabled: hasFirebaseConfiguration,
  });
  const courses = useMemo(
    () => (hasFirebaseConfiguration ? (coursesQuery.data?.items ?? []) : localCourses),
    [coursesQuery.data, localCourses]
  );
  const activeCourseId = courseId || courses[0]?.id || "";
  const batchesQuery = useQuery({
    queryKey: [...batchesKey(activeCourseId), batchPage],
    queryFn: () => loadBatchesPage(activeCourseId, PAGE_SIZE, batchCursors[batchPage]),
    enabled: hasFirebaseConfiguration && Boolean(activeCourseId),
  });
  const batches = hasFirebaseConfiguration
    ? (batchesQuery.data?.items ?? [])
    : (localBatches[activeCourseId] ?? []);
  const allBatchesQuery = useQuery({
    queryKey: allBatchesKey,
    queryFn: loadAllBatches,
    enabled: hasFirebaseConfiguration,
  });
  const studentsQuery = useQuery({
    queryKey: studentsKey,
    queryFn: loadStudentProfiles,
    enabled: hasFirebaseConfiguration,
  });
  const enrollmentsQuery = useQuery({
    queryKey: [...enrollmentsKey(activeCourseId), enrollmentPage],
    queryFn: () => loadEnrollmentsPage(activeCourseId, PAGE_SIZE, enrollmentCursors[enrollmentPage]),
    enabled: hasFirebaseConfiguration && Boolean(activeCourseId),
  });
  const activeCourse = useMemo(
    () => courses.find(item => item.id === activeCourseId),
    [courses, activeCourseId]
  );
  const enrollmentBatches = (allBatchesQuery.data ?? batches).filter(item => item.courseIds.includes(activeCourseId));
  const enrollments = hasFirebaseConfiguration ? (enrollmentsQuery.data?.items ?? []) : localEnrollments.filter(item => item.courseId === activeCourseId);
  const needle = query.trim().toLowerCase();
  const matchesStatus = (active: boolean) =>
    status === "all" || (status === "active" ? active : !active);
  const visibleEnrollments = enrollments.filter(item => {
    const student = (studentsQuery.data ?? []).find(profile => profile.id === item.studentId);
    const batch = enrollmentBatches.find(candidate => candidate.id === item.batchId);
    return `${student?.name ?? ""} ${student?.studentId ?? ""} ${batch?.name ?? ""}`.toLowerCase().includes(needle)
      && matchesStatus(item.status === "active");
  });
  const visibleCourses = courses.filter(
    item => item.title.toLowerCase().includes(needle) && matchesStatus(item.isActive)
  );
  const visibleBatches = batches.filter(
    item =>
      item.name.toLowerCase().includes(needle) && matchesStatus(item.isActive)
  );
  const courseMutation = useMutation({
    mutationFn: saveCourse,
    onSuccess: () => client.invalidateQueries({ queryKey: coursesKey }),
  });
  const deleteCourseMutation = useMutation({ mutationFn: deleteCourse, onSuccess: () => client.invalidateQueries({ queryKey: coursesKey }) });
  const deleteBatchMutation = useMutation({ mutationFn: deleteBatch, onSuccess: () => client.invalidateQueries({ queryKey: batchesKey(activeCourseId) }) });
  const batchMutation = useMutation({
    mutationFn: saveBatch,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: batchesKey(activeCourseId) }),
  });
  const linkMutation = useMutation({
    mutationFn: ({
      batchId,
      courseId,
    }: {
      batchId: string;
      courseId: string;
    }) => linkBatchToCourse(batchId, courseId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: batchesKey(activeCourseId) });
      await client.invalidateQueries({ queryKey: allBatchesKey });
    },
  });
  const enrollMutation = useMutation({
    mutationFn: ({
      batchId,
      studentId,
    }: {
      batchId: string;
      studentId: string;
    }) => enrollStudent(activeCourseId, batchId, studentId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: coursesKey });
      await client.invalidateQueries({ queryKey: batchesKey(activeCourseId) });
      await client.invalidateQueries({ queryKey: enrollmentsKey(activeCourseId) });
    },
  });
  const enrollmentStatusMutation = useMutation({
    mutationFn: ({ enrollmentId, nextStatus }: { enrollmentId: string; nextStatus: "active" | "inactive" }) => saveEnrollmentStatus(enrollmentId, nextStatus),
    onSuccess: () => client.invalidateQueries({ queryKey: enrollmentsKey(activeCourseId) }),
  });
  const enrollmentBatchMutation = useMutation({
    mutationFn: ({ enrollment, nextBatchId }: { enrollment: EnrollmentRecord; nextBatchId: string }) => updateEnrollmentBatch(enrollment, nextBatchId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: batchesKey(activeCourseId) });
      await client.invalidateQueries({ queryKey: allBatchesKey });
      await client.invalidateQueries({ queryKey: enrollmentsKey(activeCourseId) });
    },
  });
  const deleteEnrollmentMutation = useMutation({
    mutationFn: deleteEnrollment,
    onSuccess: () => client.invalidateQueries({ queryKey: enrollmentsKey(activeCourseId) }),
  });
  const selectCourse = (id: string) => {
    setCourseId(id);
    setBatchId("");
    setStudentId("");
    setQuery("");
    setBatchPage(0);
    setBatchCursors([null]);
    setEnrollmentPage(0);
    setEnrollmentCursors([null]);
    setTab("batches");
  };
  function openCourseModal(course?: CourseRecord) {
    setEditingCourseId(course?.id ?? null);
    setTitle(course?.title ?? "");
    setCourseModalOpen(true);
  }
  function openBatchModal(batch?: BatchRecord) {
    setEditingBatchId(batch?.id ?? null);
    setBatchName(batch?.name ?? "");
    setExistingBatchId("");
    setBatchModalOpen(true);
  }
  async function saveCourseForm() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const course = {
      id: editingCourseId ?? crypto.randomUUID(),
      title: nextTitle,
      isActive: editingCourseId ? courses.find(item => item.id === editingCourseId)?.isActive ?? true : true,
      enrolledStudentIds: editingCourseId ? courses.find(item => item.id === editingCourseId)?.enrolledStudentIds ?? [] : [],
    };
    try {
      if (hasFirebaseConfiguration) await courseMutation.mutateAsync(course);
      else setLocalCourses(items => editingCourseId ? items.map(item => item.id === editingCourseId ? course : item) : [...items, course]);
      setCourseId(course.id);
      setTitle("");
      setCourseModalOpen(false);
      setEditingCourseId(null);
      setNotice(`${course.title} was ${editingCourseId ? "updated" : "created"}.`);
    } catch {
      setNotice("The course could not be saved. Check Firebase permissions.");
    }
  }
  async function removeCourse(course: CourseRecord) {
    if (!window.confirm(`Delete ${course.title}? This cannot be undone.`)) return;
    try {
      if (hasFirebaseConfiguration) await deleteCourseMutation.mutateAsync(course.id);
      else setLocalCourses(items => items.filter(item => item.id !== course.id));
      if (course.id === activeCourseId) { setCourseId(""); setBatchId(""); }
      setNotice(`${course.title} was deleted.`);
    } catch { setNotice("The course could not be deleted."); }
  }
  async function removeBatch(batch: BatchRecord) {
    if (!window.confirm(`Delete ${batch.name}? This cannot be undone.`)) return;
    try {
      if (hasFirebaseConfiguration) await deleteBatchMutation.mutateAsync(batch.id);
      else setLocalBatches(items => ({ ...items, [activeCourseId]: (items[activeCourseId] ?? []).filter(item => item.id !== batch.id) }));
      setNotice(`${batch.name} was deleted.`);
    } catch { setNotice("The batch could not be deleted."); }
  }
  async function addBatch() {
    if (!activeCourseId || !batchName.trim()) return;
    const batch = {
      id: editingBatchId ?? crypto.randomUUID(),
      courseIds: [activeCourseId],
      name: batchName.trim(),
      isActive: editingBatchId ? batches.find(item => item.id === editingBatchId)?.isActive ?? true : true,
      enrolledStudentIds: editingBatchId ? batches.find(item => item.id === editingBatchId)?.enrolledStudentIds ?? [] : [],
    };
    try {
      if (hasFirebaseConfiguration) await batchMutation.mutateAsync(batch);
      else
        setLocalBatches(items => ({
          ...items,
          [activeCourseId]: editingBatchId ? (items[activeCourseId] ?? []).map(item => item.id === editingBatchId ? batch : item) : [...(items[activeCourseId] ?? []), batch],
        }));
      setBatchName("");
      setEditingBatchId(null);
      setBatchId(batch.id);
      setBatchModalOpen(false);
      setNotice(`${batch.name} was ${editingBatchId ? "updated" : "added"}.`);
    } catch (error) {
      setNotice(batchSaveErrorMessage(error));
    }
  }
  async function linkBatch() {
    if (!existingBatchId) return;
    try {
      await linkMutation.mutateAsync({
        batchId: existingBatchId,
        courseId: activeCourseId,
      });
      setBatchId(existingBatchId);
      setExistingBatchId("");
      setNotice("Existing batch linked to this course.");
    } catch {
      setNotice("The batch could not be linked.");
    }
  }
  async function enroll() {
    const selectedBatch = enrollmentBatches.find(item => item.id === batchId);
    if (!selectedBatch || !studentId) return;
    try {
      if (hasFirebaseConfiguration)
        await enrollMutation.mutateAsync({
          batchId: selectedBatch.id,
          studentId,
        });
      else
        setLocalBatches(items => ({
          ...items,
          [activeCourseId]: (items[activeCourseId] ?? []).map(item =>
            item.id === selectedBatch.id
              ? {
                  ...item,
                  enrolledStudentIds: [
                    ...new Set([...item.enrolledStudentIds, studentId]),
                  ],
                }
              : item
          ),
        }));
      if (!hasFirebaseConfiguration) {
        setLocalEnrollments(items => items.some(item => item.id === `${activeCourseId}_${selectedBatch.id}_${studentId}`) ? items : [...items, { id: `${activeCourseId}_${selectedBatch.id}_${studentId}`, courseId: activeCourseId, batchId: selectedBatch.id, studentId, status: "active" }]);
      }
      setStudentId("");
      setEnrollmentModalOpen(false);
      setNotice("Student enrolment updated.");
    } catch {
      setNotice("Enrolment failed. Check Firebase permissions.");
    }
  }
  async function toggleCourseStatus(course: CourseRecord) {
    const next = { ...course, isActive: !course.isActive };
    try {
      if (hasFirebaseConfiguration) await courseMutation.mutateAsync(next);
      else setLocalCourses(items => items.map(item => item.id === course.id ? next : item));
      setNotice(`${course.title} is now ${next.isActive ? "active" : "inactive"}.`);
    } catch { setNotice("The course status could not be updated."); }
  }
  async function toggleBatchStatus(batch: BatchRecord) {
    const next = { ...batch, isActive: !batch.isActive };
    try {
      if (hasFirebaseConfiguration) await batchMutation.mutateAsync(next);
      else setLocalBatches(items => ({ ...items, [activeCourseId]: (items[activeCourseId] ?? []).map(item => item.id === batch.id ? next : item) }));
      setNotice(`${batch.name} is now ${next.isActive ? "active" : "inactive"}.`);
    } catch { setNotice("The batch status could not be updated."); }
  }
  async function toggleEnrollmentStatus(enrollment: EnrollmentRecord) {
    const nextStatus = enrollment.status === "active" ? "inactive" : "active";
    try {
      if (hasFirebaseConfiguration) await enrollmentStatusMutation.mutateAsync({ enrollmentId: enrollment.id, nextStatus });
      else setLocalEnrollments(items => items.map(item => item.id === enrollment.id ? { ...item, status: nextStatus } : item));
      setNotice("Student enrolment status updated.");
    } catch { setNotice("The enrolment status could not be updated."); }
  }
  async function removeEnrollment(enrollment: EnrollmentRecord) {
    const student = (studentsQuery.data ?? []).find(profile => profile.id === enrollment.studentId);
    if (!window.confirm(`Remove ${student?.name ?? "this student"} from this batch?`)) return;
    try {
      if (hasFirebaseConfiguration) await deleteEnrollmentMutation.mutateAsync(enrollment.id);
      else setLocalEnrollments(items => items.filter(item => item.id !== enrollment.id));
      setNotice("Student enrolment was deleted.");
    } catch { setNotice("The enrolment could not be deleted."); }
  }
  async function updateEnrollmentBatchForStudent(nextBatchId: string) {
    if (!editingEnrollment) return;
    try {
      if (hasFirebaseConfiguration) {
        await enrollmentBatchMutation.mutateAsync({ enrollment: editingEnrollment, nextBatchId });
      } else {
        const nextEnrollment = { ...editingEnrollment, id: `${editingEnrollment.courseId}_${nextBatchId}_${editingEnrollment.studentId}`, batchId: nextBatchId };
        setLocalEnrollments(items => [
          ...items.filter(item => item.id !== editingEnrollment.id && item.id !== nextEnrollment.id),
          nextEnrollment,
        ]);
        setLocalBatches(items => ({
          ...items,
          [activeCourseId]: (items[activeCourseId] ?? []).map(item => {
            if (item.id === editingEnrollment.batchId) return { ...item, enrolledStudentIds: item.enrolledStudentIds.filter(id => id !== editingEnrollment.studentId) };
            if (item.id === nextBatchId) return { ...item, enrolledStudentIds: [...new Set([...item.enrolledStudentIds, editingEnrollment.studentId])] };
            return item;
          }),
        }));
      }
      setEditingEnrollment(null);
      setNotice("Student enrolment was updated.");
    } catch { setNotice("The enrolment could not be updated."); }
  }
  function viewCourse(course: CourseRecord) {
    setViewModal({ title: "Course details", fields: [
      { label: "Course", value: course.title }, { label: "Status", value: course.isActive ? "Active" : "Inactive" },
      { label: "Enrolled students", value: course.enrolledStudentIds.length }, { label: "Course ID", value: course.id },
    ] });
  }
  function viewBatch(batch: BatchRecord) {
    const courseNames = batch.courseIds.map(id => courses.find(course => course.id === id)?.title ?? id).join(", ") || "Not linked";
    setViewModal({ title: "Batch details", fields: [
      { label: "Batch", value: batch.name }, { label: "Courses", value: courseNames }, { label: "Status", value: batch.isActive ? "Active" : "Inactive" },
      { label: "Enrolled students", value: batch.enrolledStudentIds.length }, { label: "Batch ID", value: batch.id },
    ] });
  }
  function viewEnrollment(enrollment: EnrollmentRecord) {
    const student = (studentsQuery.data ?? []).find(profile => profile.id === enrollment.studentId);
    const batch = enrollmentBatches.find(candidate => candidate.id === enrollment.batchId);
    setViewModal({ title: "Student enrolment details", fields: [
      { label: "Student", value: student?.name ?? "Unknown student" }, { label: "Student ID", value: student?.studentId || "—" },
      { label: "Email", value: student?.email || "—" }, { label: "Course", value: activeCourse?.title ?? enrollment.courseId },
      { label: "Batch", value: batch?.name ?? "Unknown batch" }, { label: "Status", value: enrollment.status === "active" ? "Active" : "Inactive" },
    ] });
  }
  const hasCourse = Boolean(activeCourseId);
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      {coursesQuery.isError ? (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Could not load courses.
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label={tab === "enrollment" ? "All enrolments" : tab === "batches" ? "All batches" : "All courses"} value={tab === "enrollment" ? enrollments.length : tab === "batches" ? batches.length : courses.length} />
        <Metric label={tab === "enrollment" ? "Active enrolments" : tab === "batches" ? "Active batches" : "Active courses"} value={tab === "enrollment" ? enrollments.filter(item => item.status === "active").length : (tab === "batches" ? batches : courses).filter(item => item.isActive).length} />
        <Metric label={tab === "enrollment" ? "Inactive enrolments" : tab === "batches" ? "Inactive batches" : "Inactive courses"} value={tab === "enrollment" ? enrollments.filter(item => item.status !== "active").length : (tab === "batches" ? batches : courses).filter(item => !item.isActive).length} />
      </div>
      <div className="mt-6 flex gap-6 overflow-x-auto border-b border-stone-200">
        {(["courses", "batches", "enrollment"] as Tab[]).map(item => (
          <button
            key={item}
            type="button"
            disabled={item !== "courses" && !hasCourse}
            onClick={() => {
              setTab(item);
              setQuery("");
            }}
            className={`shrink-0 border-b-2 px-2 pb-3 text-sm font-semibold capitalize disabled:opacity-40 ${tab === item ? "border-cyan-500 text-cyan-600" : "border-transparent text-stone-500 hover:text-stone-900"}`}
          >
            {item === "enrollment" ? "Student enrolment" : item}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-stone-400">Use filters to narrow the listing.</span>
          <button type="button" onClick={() => setStatus(status === "all" ? "active" : status === "active" ? "inactive" : "all")} className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"><Filter size={14} />{status === "all" ? "Filters" : `${status[0].toUpperCase()}${status.slice(1)}`}</button>
          <button type="button" onClick={() => { setQuery(""); setStatus("all"); }} className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"><X size={14} />Clear all</button>
      </div>
      {tab === "courses" ? (
        <div className="mt-5">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => openCourseModal()}>
              <BookPlus size={16} />
              Add course
            </Button>
          </div>
          <DataTable
            title="Courses"
            subtitle={`${visibleCourses.length} shown on this page`}
            onSearchChange={setQuery}
            searchValue={query}
            searchPlaceholder="Search courses"
          >
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Students</Th>
                <Th>Status</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {coursesQuery.isLoading ? (
                <LoadingRow />
              ) : (
                visibleCourses.map(item => (
                  <tr key={item.id} className="hover:bg-emerald-50/40">
                    <Td strong>{item.title}</Td>
                    <Td>
                      <UsersRound size={14} className="mr-1 inline" />
                      {item.enrolledStudentIds.length}
                    </Td>
                    <Td>
                      <StatusToggle active={item.isActive} onToggle={() => void toggleCourseStatus(item)} disabled={courseMutation.isPending} />
                    </Td>
                    <Td align="right">
                      <Actions onView={() => viewCourse(item)} onEdit={() => openCourseModal(item)} onDelete={() => void removeCourse(item)} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
          <TablePagination page={coursePage} canGoNext={Boolean(coursesQuery.data?.nextCursor)} onPrevious={() => setCoursePage(page => Math.max(0, page - 1))} onNext={() => {
            const cursor = coursesQuery.data?.nextCursor;
            if (!cursor) return;
            setCourseCursors(cursors => { const next = [...cursors]; next[coursePage + 1] = cursor; return next; });
            setCoursePage(page => page + 1);
          }} />
        </div>
      ) : tab === "batches" ? (
        <div className="mt-5">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => openBatchModal()}>
              <Layers3 size={16} />
              Add batch
            </Button>
          </div>
          <DataTable
            title={`${activeCourse?.title ?? "Course"} batches`}
            subtitle={`${visibleBatches.length} shown on this page`}
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder="Search batches"
          >
            <thead>
              <tr>
                <Th>Batch</Th>
                <Th>Course</Th>
                <Th>Enrolled</Th>
                <Th>Status</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {batchesQuery.isLoading ? (
                <LoadingRow />
              ) : (
                visibleBatches.map(item => (
                  <tr key={item.id} className="hover:bg-emerald-50/40">
                    <Td strong>{item.name}</Td>
                    <Td>{activeCourse?.title}</Td>
                    <Td>
                      <UsersRound size={14} className="mr-1 inline" />
                      {item.enrolledStudentIds.length}
                    </Td>
                    <Td>
                      <StatusToggle active={item.isActive} onToggle={() => void toggleBatchStatus(item)} disabled={batchMutation.isPending} />
                    </Td>
                    <Td align="right">
                      <Actions onView={() => viewBatch(item)} onEdit={() => openBatchModal(item)} onDelete={() => void removeBatch(item)} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
          <TablePagination page={batchPage} canGoNext={Boolean(batchesQuery.data?.nextCursor)} onPrevious={() => setBatchPage(page => Math.max(0, page - 1))} onNext={() => {
            const cursor = batchesQuery.data?.nextCursor;
            if (!cursor) return;
            setBatchCursors(cursors => { const next = [...cursors]; next[batchPage + 1] = cursor; return next; });
            setBatchPage(page => page + 1);
          }} />
        </div>
      ) : (
        <div className="mt-5">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => { setBatchId(current => current || enrollmentBatches[0]?.id || ""); setStudentId(""); setEnrollmentModalOpen(true); }} disabled={!enrollmentBatches.length}>
              <UserPlus size={16} />
              Enroll student
            </Button>
          </div>
          {!enrollmentBatches.length ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500">Add a batch first, then enrol students here.</div>
          ) : (
            <>
              <DataTable title="Student enrolment" subtitle={`${visibleEnrollments.length} shown on this page`} searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search student or batch">
                <thead><tr><Th>Student</Th><Th>Student ID</Th><Th>Batch</Th><Th>Status</Th><Th align="right">Action</Th></tr></thead>
                <tbody>
                  {enrollmentsQuery.isLoading ? <LoadingRow columns={5} /> : visibleEnrollments.length ? visibleEnrollments.map(item => {
                    const student = (studentsQuery.data ?? []).find(profile => profile.id === item.studentId);
                    const batch = enrollmentBatches.find(candidate => candidate.id === item.batchId);
                    return <tr key={item.id} className="hover:bg-emerald-50/40"><Td strong>{student?.name ?? "Unknown student"}</Td><Td>{student?.studentId || "—"}</Td><Td>{batch?.name ?? "Unknown batch"}</Td><Td><StatusToggle active={item.status === "active"} onToggle={() => void toggleEnrollmentStatus(item)} disabled={enrollmentStatusMutation.isPending} /></Td><Td align="right"><Actions onView={() => viewEnrollment(item)} onEdit={() => setEditingEnrollment(item)} onDelete={() => void removeEnrollment(item)} /></Td></tr>;
                  }) : <EmptyRow columns={5} message="No students enrolled yet." />}
                </tbody>
              </DataTable>
              <TablePagination page={enrollmentPage} canGoNext={Boolean(enrollmentsQuery.data?.nextCursor)} onPrevious={() => setEnrollmentPage(page => Math.max(0, page - 1))} onNext={() => {
                const cursor = enrollmentsQuery.data?.nextCursor;
                if (!cursor) return;
                setEnrollmentCursors(cursors => { const next = [...cursors]; next[enrollmentPage + 1] = cursor; return next; });
                setEnrollmentPage(page => page + 1);
              }} />
            </>
          )}
        </div>
      )}
      {notice ? (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          {notice}
        </p>
      ) : null}
      {courseModalOpen ? <CourseModal title={title} setTitle={setTitle} editing={Boolean(editingCourseId)} pending={courseMutation.isPending} onClose={() => setCourseModalOpen(false)} onSubmit={() => void saveCourseForm()} /> : null}
      {batchModalOpen ? <BatchModal courseTitle={activeCourse?.title ?? "this course"} name={batchName} setName={setBatchName} editing={Boolean(editingBatchId)} pending={batchMutation.isPending} existingBatchId={existingBatchId} setExistingBatchId={setExistingBatchId} batches={allBatchesQuery.data ?? []} activeCourseId={activeCourseId} linkPending={linkMutation.isPending} onClose={() => setBatchModalOpen(false)} onSubmit={() => void addBatch()} onLink={() => void linkBatch()} /> : null}
      {enrollmentModalOpen ? <EnrollmentModal batches={enrollmentBatches} students={studentsQuery.data ?? []} batchId={batchId} studentId={studentId} setBatchId={setBatchId} setStudentId={setStudentId} pending={enrollMutation.isPending} onClose={() => setEnrollmentModalOpen(false)} onSubmit={() => void enroll()} /> : null}
      {viewModal ? <DetailsModal {...viewModal} onClose={() => setViewModal(null)} /> : null}
      {editingEnrollment ? <EnrollmentBatchModal enrollment={editingEnrollment} batches={enrollmentBatches} students={studentsQuery.data ?? []} pending={enrollmentBatchMutation.isPending} onClose={() => setEditingEnrollment(null)} onSubmit={batchId => void updateEnrollmentBatchForStudent(batchId)} /> : null}
    </section>
  );
}
function Actions({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return <div className="inline-flex items-center gap-1">
    <Button size="sm" variant="outline" onClick={onView}><Eye size={14} />View</Button>
    <Button size="sm" variant="outline" onClick={onEdit}><Pencil size={14} />Update</Button>
    <button type="button" aria-label="Delete" title="Delete" onClick={onDelete} className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
  </div>;
}
function DetailsModal({ title, fields, onClose }: { title: string; fields: { label: string; value: ReactNode }[]; onClose: () => void }) {
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" onMouseDown={onClose}>
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Academic workspace</p><h4 className="mt-1 text-xl font-bold">{title}</h4></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X size={18} /></button></div>
      <dl className="mt-6 divide-y divide-stone-100 rounded-xl border border-stone-200">{fields.map(field => <div key={field.label} className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4"><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">{field.label}</dt><dd className="break-words text-sm font-medium text-stone-800 sm:col-span-2">{field.value}</dd></div>)}</dl>
      <div className="mt-6 flex justify-end"><Button type="button" onClick={onClose}>Close</Button></div>
    </div>
  </div>;
}
function EnrollmentBatchModal({ enrollment, batches, students, pending, onClose, onSubmit }: { enrollment: EnrollmentRecord; batches: BatchRecord[]; students: { id: string; name: string; studentId: string }[]; pending: boolean; onClose: () => void; onSubmit: (batchId: string) => void }) {
  const [batchId, setBatchId] = useState(enrollment.batchId);
  const student = students.find(item => item.id === enrollment.studentId);
  return <div role="dialog" aria-modal="true" aria-label="Update student enrolment" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" onMouseDown={onClose}>
    <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); onSubmit(batchId); }}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Student enrolment</p><h4 className="mt-1 text-xl font-bold">Update enrolment</h4></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X size={18} /></button></div>
      <label className="mt-6 block text-xs font-bold text-stone-700">Student<select value={enrollment.studentId} disabled className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-stone-200 bg-stone-100 px-3 text-sm font-normal text-stone-500"><option value={enrollment.studentId}>{student ? `${student.name}${student.studentId ? ` · ${student.studentId}` : ""}` : "Unknown student"}</option></select></label>
      <label className="mt-4 block text-xs font-bold text-stone-700">Batch<select value={batchId} onChange={event => setBatchId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal">{batches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || batchId === enrollment.batchId}>{pending ? "Saving..." : "Save changes"}</Button></div>
    </form>
  </div>;
}
function CourseModal({ title, setTitle, editing, pending, onClose, onSubmit }: { title: string; setTitle: (value: string) => void; editing: boolean; pending: boolean; onClose: () => void; onSubmit: () => void }) {
  return <div role="dialog" aria-modal="true" aria-label={editing ? "Edit course" : "Add course"} className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" onMouseDown={onClose}>
    <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Academic workspace</p><h4 className="mt-1 text-xl font-bold">{editing ? "Edit course" : "Add course"}</h4></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X size={18} /></button></div>
      <Field label="Course name" value={title} setValue={setTitle} placeholder="e.g. Web development" />
      <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!title.trim() || pending}><BookPlus size={16} />{editing ? "Save changes" : "Add course"}</Button></div>
    </form>
  </div>;
}
function BatchModal({ courseTitle, name, setName, editing, pending, existingBatchId, setExistingBatchId, batches, activeCourseId, linkPending, onClose, onSubmit, onLink }: { courseTitle: string; name: string; setName: (value: string) => void; editing: boolean; pending: boolean; existingBatchId: string; setExistingBatchId: (value: string) => void; batches: BatchRecord[]; activeCourseId: string; linkPending: boolean; onClose: () => void; onSubmit: () => void; onLink: () => void }) {
  return <div role="dialog" aria-modal="true" aria-label={editing ? "Edit batch" : "Add batch"} className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" onMouseDown={onClose}>
    <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Academic workspace</p><h4 className="mt-1 flex items-center gap-2 text-xl font-bold"><Layers3 size={19} className="text-emerald-700" />{editing ? "Edit batch" : "Add a batch"}</h4><p className="mt-1 text-xs text-stone-500">For {courseTitle}</p></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X size={18} /></button></div>
      <Field label="Batch name" value={name} setValue={setName} placeholder="e.g. Weekend batch" />
      <Button type="submit" className="mt-4 w-full" disabled={!name.trim() || pending}>{editing ? "Save batch" : "Add batch"}</Button>
      {!editing ? <div className="mt-5 border-t border-stone-200 pt-4"><label className="text-xs font-bold text-stone-700">Link existing batch</label><select value={existingBatchId} onChange={event => setExistingBatchId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"><option value="">Select existing batch</option>{batches.filter(item => !item.courseIds.includes(activeCourseId)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Button type="button" variant="outline" className="mt-2 w-full" disabled={!existingBatchId || linkPending} onClick={onLink}>Link batch</Button></div> : null}
    </form>
  </div>;
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-emerald-50 px-4 py-2 text-center">
      <p className="text-lg font-bold text-emerald-900">{value}</p>
      <p className="text-[10px] font-bold uppercase text-emerald-800/60">
        {label}
      </p>
    </div>
  );
}
function Th({ children, align }: { children: ReactNode; align?: "right" }) {
  return (
    <th
      className={`bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500 ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  strong,
  align,
}: {
  children: ReactNode;
  strong?: boolean;
  align?: "right";
}) {
  return (
    <td
      className={`border-t border-stone-100 px-5 py-4 text-stone-600 ${strong ? "font-bold text-stone-800" : ""} ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </td>
  );
}
function StatusToggle({ active, onToggle, disabled }: { active: boolean; onToggle: () => void; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={active} aria-label={`Set status to ${active ? "inactive" : "active"}`} disabled={disabled} onClick={onToggle} className={`inline-flex items-center gap-2 rounded-full px-1 py-1 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"}`}><span className={`size-4 rounded-full transition ${active ? "bg-emerald-600" : "bg-stone-400"}`} /><span className="pr-2">{active ? "Active" : "Inactive"}</span></button>;
}
function LoadingRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      <td
        colSpan={columns}
        className="border-t border-stone-100 px-5 py-8 text-center text-stone-500"
      >
        Loading…
      </td>
    </tr>
  );
}
function EmptyRow({ columns, message }: { columns: number; message: string }) {
  return <tr><td colSpan={columns} className="border-t border-stone-100 px-5 py-8 text-center text-stone-500">{message}</td></tr>;
}
function Field({
  label,
  value,
  setValue,
  placeholder,
  upper,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  upper?: boolean;
}) {
  return (
    <label className="mt-4 block text-xs font-bold text-stone-700">
      {label}
      <input
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder={placeholder}
        className={`mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600 ${upper ? "uppercase" : ""}`}
      />
    </label>
  );
}
function EnrollmentModal({ batches, students, batchId, studentId, setBatchId, setStudentId, pending, onClose, onSubmit }: {
  batches: BatchRecord[];
  students: { id: string; name: string; studentId: string }[];
  batchId: string;
  studentId: string;
  setBatchId: (value: string) => void;
  setStudentId: (value: string) => void;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Enroll student" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" onMouseDown={onClose}>
      <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Student enrolment</p><h4 className="mt-1 flex items-center gap-2 text-xl font-bold"><UserPlus size={19} className="text-emerald-700" />Enroll student</h4></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X size={18} /></button></div>
      <label className="mt-5 block text-xs font-bold">
        Batch
        <select
          value={batchId}
          onChange={event => {
            setBatchId(event.target.value);
            setStudentId("");
          }}
          className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
        >
          {batches.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-xs font-bold">
        Student
        <select
          value={studentId}
          onChange={event => setStudentId(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
        >
          <option value="">Select a student</option>
          {students.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.studentId ? ` · ${item.studentId}` : ""}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        className="mt-6 w-full"
        disabled={!studentId || pending}
      >
        <UserPlus size={16} />
        {pending ? "Enrolling..." : "Enroll student"}
      </Button>
      </form>
    </div>
  );
}
